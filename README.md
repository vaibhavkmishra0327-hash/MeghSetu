# MeghSetu

**Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts** — SIH 2026, SIH26080.

MeghSetu is a student prototype that classifies monsoon weather patterns, routes forecasts to pattern-specific correction models, estimates the chance of rainfall above 64.5 mm, and compares results using held-out verification metrics.

> The included rainfall values are generated sample data for demonstrating the software workflow. They are not live observations, operational forecasts, or proof of real-world forecast skill.

## Run locally

Requirements: Python 3.10+ and Node.js 20+.

Windows PowerShell, terminal 1:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r backend\requirements.txt
$env:PYTHONPATH = "$PWD\backend"
uvicorn app.main:app --app-dir backend --reload
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API docs are at http://localhost:8000/docs. No API key is required for local use. The map uses OpenStreetMap tiles when internet is available and has a generated-grid fallback.

## Deploy for a live link

The dashboard is a Vite frontend and the model is a Python FastAPI service. Deploy the frontend to Vercel and the API to a Python web host such as Render; Vercel then calls the API using an environment variable.

### 1. Push this folder to GitHub

Create a new empty GitHub repository, then from this project folder run:

```powershell
git init
git add .
git commit -m "Initial MeghSetu application"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own repository URL. Do not commit `.env` files, credentials, or generated model files.

### 2. Publish the Python API

In Render, create a new Blueprint and select this GitHub repository. Render reads `render.yaml` and creates the `meghsetu-api` service. Wait for deployment, then check `https://YOUR-API.onrender.com/health`.

### 3. Publish the frontend on Vercel

Import the same GitHub repository in Vercel. Set **Root Directory** to `frontend`. The included `frontend/vercel.json` configures the Vite build. Add this environment variable in Vercel project settings:

```text
VITE_API_URL=https://YOUR-API.onrender.com
```

Use your actual API URL with no trailing slash. Redeploy after adding it. Vercel will provide the public website URL. The frontend and backend are separate deployments; the `VITE_API_URL` setting connects them.

## App pages

Overview, Rainfall map, Weather patterns, Forecast comparison, Heavy rain watch, Verification, Project details, and Sources are available in the left navigation. The day/night control changes the full application theme.

## How the model works

A deterministic spatial generator creates rainfall and atmospheric predictors for six synthetic weather patterns. The pipeline splits rows into training and held-out sets before fitting the models. A scikit-learn Random Forest predicts the regime; six regime-specific Random Forest regressors correct raw rainfall; a global correction model provides a baseline; and a calibrated classifier estimates heavy-rain probability. The dashboard calculates scores from held-out generated data.

Reported scores include RMSE, MAE, bias, CSI, ETS, POD, FAR, FSS and Brier score. Because the data are synthetic, these values demonstrate calculations only and must not be presented as operational validation.

## Replace sample data

Add a source adapter under `backend/app/data/` that returns the features and targets expected by `backend/app/services/pipeline.py`. NetCDF can be read with xarray and Parquet with pandas. Preserve units, valid time, grid coordinates and forecast lead time. For real evaluation, use time-aware and spatially grouped splits and compare against an operational baseline.

## Checks and containers

```powershell
pytest tests
```

For local containers, run `docker compose up --build`; open http://localhost:5173. The included `DEMO_GUIDE.md` has a presentation walkthrough.

## References

SIH 2026 problem SIH26080, Ministry of Earth Sciences/NCMRWF. MOSDAC: https://mosdac.gov.in/ · Bhuvan: https://bhuvan.nrsc.gov.in/home/ · India-WRIS: https://www.india-wris.nrsc.gov.in/ · PMFBY: https://pmfby.gov.in/ · NDRF: https://ndrf.gov.in/ · Allen, Ferro & Kwasniok (2019): https://doi.org/10.1002/qj.3638 · Cannon, Sobie & Murdock (2015): https://doi.org/10.1175/JCLI-D-14-00754.1 · Shi et al. (2017): https://arxiv.org/abs/1706.03458 · Allen (2020): https://doi.org/10.1002/qj.3806.
