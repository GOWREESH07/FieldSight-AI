from db.models import ContributingFactors

SEVERITY_BASE = {"low": 25, "medium": 50, "high": 75, "critical": 100}

def score_risk(classification: dict, all_classifications: list) -> tuple[float, ContributingFactors]:
    """
    risk_score = base_severity × height_factor × duration_factor × repeat_factor
    
    height_factor: 1.0 + min(0.5, estimated_drop_height_m * 0.25) if drop height given, else 1.0
    duration_factor: 1.0 + min(0.3, handling_duration_seconds / 30.0)
    repeat_factor: 1.2 if same behaviour_id appears >1 time in all_classifications, else 1.0
    
    clamp result to [0, 100]
    Return (score, ContributingFactors)
    """
    risk_level = classification.get("risk_level", "low")
    base_severity = float(SEVERITY_BASE.get(risk_level, 25))
    
    drop_height = classification.get("estimated_drop_height_m")
    if drop_height is not None:
        height_factor = 1.0 + min(0.5, float(drop_height) * 0.25)
    else:
        height_factor = 1.0
        
    duration = classification.get("handling_duration_seconds", 0.0)
    duration_factor = 1.0 + min(0.3, float(duration) / 30.0)
    
    behaviour_id = classification.get("behaviour_id")
    count = sum(1 for c in all_classifications if c.get("behaviour_id") == behaviour_id)
    repeat_factor = 1.2 if count > 1 else 1.0
    
    score = base_severity * height_factor * duration_factor * repeat_factor
    score = max(0.0, min(100.0, score))
    
    factors = ContributingFactors(
        base_severity=base_severity,
        height_factor=height_factor,
        duration_factor=duration_factor,
        repeat_factor=repeat_factor
    )
    
    return score, factors
