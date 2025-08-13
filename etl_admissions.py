import argparse, re, math
from pathlib import Path
import pandas as pd

# ---------- small helpers ----------
def snake(s: str) -> str:
    s = (s or "").replace("\ufeff","").strip()
    s = re.sub(r"[^\w]+", "_", s)
    return re.sub(r"__+", "_", s).strip("_").lower()

def read_csv_safe(path: Path):
    for enc in [None, "utf-8", "utf-8-sig", "latin1"]:
        try:
            df = pd.read_csv(path, encoding=enc)
            df.columns = [snake(c) for c in df.columns]
            return df
        except Exception:
            pass
    raise RuntimeError(f"Could not read {path}")

def prefer_base_cols(df: pd.DataFrame):
    drop = [c for c in df.columns if c.endswith("_1") and c[:-2] in df.columns]
    return df.drop(columns=drop, errors="ignore")

def simplify_control(txt: str):
    if not isinstance(txt, str): return None
    t = txt.lower()
    if "public" in t: return "Public"
    if "private not-for-profit" in t or "private not for profit" in t: return "Private nonprofit"
    if "private for-profit" in t or "private for profit" in t: return "Private for-profit"
    return txt

def simplify_level(txt: str):
    if not isinstance(txt, str): return None
    t = txt.lower()
    if "four or more years" in t or "4-year" in t: return "4-year"
    if "2" in t and "year" in t: return "2-year"
    if "less than 2" in t or "<2" in t: return "<2-year"
    return txt

def pct_series(num, den):
    n = pd.to_numeric(num, errors="coerce")
    d = pd.to_numeric(den, errors="coerce")
    with pd.option_context('future.no_silent_downcasting', True):
        out = (n / d) * 100.0
    return out

def iround(x):
    try:
        if pd.isna(x): return None
        return int(round(float(x)))
    except Exception:
        return None

# ---------- loaders ----------
def load_uni_info(p: Path):
    df = prefer_base_cols(read_csv_safe(p))
    # try to pick optional columns if present
    city_cols = [c for c in df.columns if c in ("city","city_location_of_institution","city_of_institution")]
    web_cols  = [c for c in df.columns if c in ("institution_website_address","institution_internet_website_address","institution_s_internet_website_address","insturl")]
    adm_cols  = [c for c in df.columns if c in ("admissions_office_web_address","admissions_website","admurl")]

    out = pd.DataFrame({
        "unitid": df.get("unitid"),
        "name": df.get("institution_name"),
        "state": df.get("state_abbreviation"),
        "control": df.get("control_of_institution"),
        "level": df.get("level_of_institution"),
        "carnegie_basic": df.get("carnegie_classification_2021_basic"),
        "city": df[city_cols[0]] if city_cols else None,
        "website": df[web_cols[0]] if web_cols else None,
        "admissions_url": df[adm_cols[0]] if adm_cols else None,
    })
    out["control"] = out["control"].map(simplify_control)
    out["level"]   = out["level"].map(simplify_level)
    return out

def load_aeg(p: Path, year: int):
    df = prefer_base_cols(read_csv_safe(p))
    # main numeric cols
    need = [
        "unitid","applicants_total","admissions_total","enrolled_total",
        "percent_admitted_total","admissions_yield_total",
        "graduation_rate_bachelor_degree_within_6_years_total",
        "full_time_retention_rate","student_to_faculty_ratio",
        "total_enrollment"
    ]
    have = [c for c in need if c in df.columns]
    out = df[have].copy()

    # derive acceptance/yield if missing
    if "percent_admitted_total" not in out.columns and {"admissions_total","applicants_total"} <= set(out.columns):
        out["percent_admitted_total"] = pct_series(out["admissions_total"], out["applicants_total"])
    if "admissions_yield_total" not in out.columns and {"enrolled_total","admissions_total"} <= set(out.columns):
        out["admissions_yield_total"] = pct_series(out["enrolled_total"], out["admissions_total"])

    # test score submission rates & counts
    for c in [
        "number_of_first_time_degree_certificate_seeking_students_submitting_sat_scores",
        "percent_of_first_time_degree_certificate_seeking_students_submitting_sat_scores",
        "number_of_first_time_degree_certificate_seeking_students_submitting_act_scores",
        "percent_of_first_time_degree_certificate_seeking_students_submitting_act_scores",
        "sat_evidence_based_reading_and_writing_25th_percentile_score",
        "sat_evidence_based_reading_and_writing_50th_percentile_score",
        "sat_evidence_based_reading_and_writing_75th_percentile_score",
        "sat_math_25th_percentile_score","sat_math_50th_percentile_score","sat_math_75th_percentile_score",
        "act_composite_25th_percentile_score","act_composite_50th_percentile_score","act_composite_75th_percentile_score",
        "act_english_25th_percentile_score","act_english_50th_percentile_score","act_english_75th_percentile_score",
        "act_math_25th_percentile_score","act_math_50th_percentile_score","act_math_75th_percentile_score",
    ]:
        if c in df.columns:
            out[c] = pd.to_numeric(df[c], errors="coerce")

    out["year"] = year
    # rename for clarity
    out = out.rename(columns={
        "percent_admitted_total": "acceptance_rate",
        "admissions_yield_total": "yield",
        "graduation_rate_bachelor_degree_within_6_years_total": "grad_rate_6yr",
        "full_time_retention_rate": "retention_full_time",
        "student_to_faculty_ratio": "student_faculty_ratio"
    })
    return out

def load_tuition(p: Path):
    df = prefer_base_cols(read_csv_safe(p))
    # rename DRVIC columns -> 2020_21 etc.
    ren = {c: c.replace("drvic2023_tuition_and_fees_", "").replace("-", "_") for c in df.columns if c.startswith("drvic2023_tuition_and_fees_")}
    df = df.rename(columns=ren)
    keep_years = [c for c in df.columns if c in ("2020_21","2021_22","2022_23","2023_24")]
    long = df[["unitid"] + keep_years].melt(id_vars=["unitid"], var_name="tuition_year", value_name="tuition_and_fees")
    long["tuition_and_fees"] = pd.to_numeric(long["tuition_and_fees"], errors="coerce")
    return long

def derive_requirements_2023(df23: pd.DataFrame):
    # map requirement text -> bucket
    def bucket(val: str):
        if not isinstance(val, str): return None
        t = val.lower()
        if "not considered" in t: return "not_considered"
        if "required to be considered" in t: return "required"
        if "not required" in t and "considered" in t: return "considered"
        # fallback
        if "required" in t: return "required"
        if "considered" in t: return "considered"
        return "not_considered"

    fields = [
        "secondary_school_gpa","secondary_school_rank","secondary_school_record",
        "completion_of_college_preparatory_program","recommendations",
        "formal_demonstration_of_competencies","work_experience",
        "personal_statement_or_essay","legacy_status","admission_test_scores",
        "english_proficiency_test","other_test_wonderlic_wisc_iii_etc"
    ]
    present = [f for f in fields if f in df23.columns]
    req_rows = []
    for _, r in df23[["unitid"] + present].iterrows():
        buckets = {"required": [], "considered": [], "not_considered": []}
        for f in present:
            b = bucket(r[f])
            if b:
                buckets[b].append(f.replace("_"," ").title())
        req_rows.append({
            "unitid": int(r["unitid"]),
            "required": sorted(buckets["required"]),
            "considered": sorted(buckets["considered"]),
            "not_considered": sorted(buckets["not_considered"])
        })
    return pd.DataFrame(req_rows)

# ---------- builders ----------
def build_institutions(base: pd.DataFrame, a23: pd.DataFrame, tuition_long: pd.DataFrame):
    t_2324 = tuition_long[tuition_long["tuition_year"]=="2023_24"][["unitid","tuition_and_fees"]].rename(columns={"tuition_and_fees":"tuition_2023_24"})
    merged = (base
        .merge(a23[["unitid","acceptance_rate","yield","grad_rate_6yr","total_enrollment"]], on="unitid", how="left")
        .merge(t_2324, on="unitid", how="left"))

    # round pcts for UI
    for c in ["acceptance_rate","yield","grad_rate_6yr"]:
        merged[c] = merged[c].apply(iround)

    out = merged[["unitid","name","city","state","control","level","acceptance_rate","yield","tuition_2023_24","grad_rate_6yr","total_enrollment","website","admissions_url"]]
    return out[out["name"].notna()]

def build_institutions_index(base: pd.DataFrame):
    return base[["unitid","name","state"]].dropna()

def build_metrics_by_year(a22: pd.DataFrame, a23: pd.DataFrame):
    cols = [
        "unitid","year","applicants_total","admissions_total","enrolled_total",
        "acceptance_rate","yield","grad_rate_6yr","retention_full_time","student_faculty_ratio","total_enrollment",
        # submission counts/pcts
        "number_of_first_time_degree_certificate_seeking_students_submitting_sat_scores",
        "percent_of_first_time_degree_certificate_seeking_students_submitting_sat_scores",
        "number_of_first_time_degree_certificate_seeking_students_submitting_act_scores",
        "percent_of_first_time_degree_certificate_seeking_students_submitting_act_scores",
        # SAT percentiles
        "sat_evidence_based_reading_and_writing_25th_percentile_score",
        "sat_evidence_based_reading_and_writing_50th_percentile_score",
        "sat_evidence_based_reading_and_writing_75th_percentile_score",
        "sat_math_25th_percentile_score","sat_math_50th_percentile_score","sat_math_75th_percentile_score",
        # ACT percentiles
        "act_composite_25th_percentile_score","act_composite_50th_percentile_score","act_composite_75th_percentile_score",
        "act_english_25th_percentile_score","act_english_50th_percentile_score","act_english_75th_percentile_score",
        "act_math_25th_percentile_score","act_math_50th_percentile_score","act_math_75th_percentile_score",
    ]
    def keep(df): return df[[c for c in cols if c in df.columns]].copy()
    m = pd.concat([keep(a22), keep(a23)], ignore_index=True)

    # round main pcts
    for c in ["acceptance_rate","yield","grad_rate_6yr","retention_full_time",
              "percent_of_first_time_degree_certificate_seeking_students_submitting_sat_scores",
              "percent_of_first_time_degree_certificate_seeking_students_submitting_act_scores"]:
        if c in m.columns:
            m[c] = m[c].apply(iround)

    # derived funnel counts for convenience
    if {"applicants_total","acceptance_rate"} <= set(m.columns):
        m["admitted_est"] = (pd.to_numeric(m["applicants_total"], errors="coerce") * (pd.to_numeric(m["acceptance_rate"], errors="coerce")/100.0)).round()
    if {"admissions_total","yield"} <= set(m.columns):
        m["enrolled_est"] = (pd.to_numeric(m["admissions_total"], errors="coerce") * (pd.to_numeric(m["yield"], errors="coerce")/100.0)).round()
    return m

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="Folder with CSVs")
    ap.add_argument("--out", required=True, help="Output folder (e.g., public/data)")
    args = ap.parse_args()

    src = Path(args.src); out = Path(args.out); out.mkdir(parents=True, exist_ok=True)

    base = load_uni_info(src / "2023_uni_information.csv")
    a22  = load_aeg(src / "2022_Admissions_Enrollment_Graduation.csv", 2022)
    a23  = load_aeg(src / "2023_Admissions_Enrollment_Graduation.csv", 2023)
    tuition_long = load_tuition(src / "2023_tuition.csv")

    institutions       = build_institutions(base, a23, tuition_long)
    institutions_index = build_institutions_index(base)
    metrics_by_year    = build_metrics_by_year(a22, a23)
    req23              = derive_requirements_2023(prefer_base_cols(read_csv_safe(src / "2023_Admissions_Enrollment_Graduation.csv")))
    tuition_ts         = tuition_long.sort_values(["unitid","tuition_year"])

    institutions.to_json(out / "institutions.json", orient="records", indent=2)
    institutions_index.to_json(out / "institutions_index.json", orient="records", indent=2)
    metrics_by_year.to_json(out / "metrics_by_year.json", orient="records", indent=2)
    req23.to_json(out / "requirements_2023.json", orient="records", indent=2)
    tuition_ts.to_json(out / "tuition_timeseries.json", orient="records", indent=2)

    print("Wrote institutions.json, institutions_index.json, metrics_by_year.json, requirements_2023.json, tuition_timeseries.json")

if __name__ == "__main__":
    main()
