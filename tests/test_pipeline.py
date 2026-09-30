import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"backend"))
from app.data.synthetic import make_data,REGIMES
from app.services.pipeline import fit_demo

def test_generator_is_seeded_and_complete():
 a=make_data(650,7); b=make_data(650,7)
 assert a.equals(b)
 assert set(a.regime).issubset(set(REGIMES))
 assert a.observation_mm.min()>=0 and a.nwp_mm.min()>=0

def test_pipeline_holdout_and_metrics():
 x=fit_demo(5,800); assert len(x["test"]) in (175,176)
 assert set(x["test"].predicted_regime).issubset(set(REGIMES))
 assert all(k in x["metrics"]["regime_aware"] for k in ("rmse","mae","bias","csi","ets","pod","far","fss"))
 assert 0<=x["metrics"]["brier"]<=1

def test_regime_specialists_and_probability():
 x=fit_demo(11,800); assert set(x["models"])==set(REGIMES)
 assert x["test"].heavy_probability.between(0,1).all()
