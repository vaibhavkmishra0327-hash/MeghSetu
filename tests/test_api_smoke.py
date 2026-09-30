import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"backend"))
from fastapi.testclient import TestClient
import app.main as api
from app.services.pipeline import fit_demo

def test_health_and_prediction_smoke():
 api.state=fit_demo(42,800)
 client=TestClient(api.app)
 assert client.get("/health").json()=={"status":"ok","demo_mode":True}
 result=client.post("/predict",json={"latitude":22.5,"longitude":82.5,"month":7,"nwp_mm":45,"humidity":75,"cape":900,"wind":12,"elevation":250})
 assert result.status_code==200
 body=result.json()
 assert body["raw_mm"]==45 and body["corrected_mm"]>=0
 assert 0<=body["heavy_probability"]<=1
 assert body["regime"]
 assert client.get("/forecast/2026-09-30").status_code==200
