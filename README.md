# Predictive Intelligence System for Student Performance

This project predicts and visualizes student academic performance using academic scores, attendance, and engagement data. It includes a FastAPI backend, a hybrid machine learning model, and a React + Vite dashboard.

## What It Does

The model combines several approaches:

- `Decision Tree` for a simple baseline
- `Random Forest` for stronger prediction accuracy
- `MLP Neural Network` for non-linear patterns
- `Voting Ensemble` to combine the model outputs

The dashboard includes:

- student record entry
- saved record browsing
- model predictions and confidence
- summary statistics
- category distribution
- confusion matrix

## Input Fields

The model uses:

- Attendance percentage
- Assignment score
- Quiz score
- Test score
- Continuous assessment score
- Previous GPA
- Missed classes
- LMS engagement
- Study hours
- Department
- Level

## Project Structure

```text
project/
  app/
    __init__.py
    api.py
    config.py
    model.py
    schemas.py
    train.py
    utils.py
  data/
    sample_students.csv
  frontend/
    index.html
    package.json
    vite.config.js
    src/
      App.jsx
      main.jsx
      styles.css
  models/
    .gitkeep
  README.md
  requirements.txt
```

## Quick Start

### Easy Run Steps

1. Open the project folder on your computer.
2. Double-click `setup.cmd` to install the required files.
3. Double-click `train-model.cmd` to prepare the prediction model.
4. Double-click `run-backend.cmd` to start the backend.
5. Double-click `run-frontend.cmd` in another Command Prompt to open the site.
6. Open this link in your browser:

```text
http://127.0.0.1:5174
```

### One-Click Start

If you want everything to start at once, run:

```bat
start.cmd
```

### Manual Start

```bat
.venv\Scripts\activate
python -m app.train
python -m uvicorn app.api:app --reload --port 8003
cd frontend
npm run dev -- --host 127.0.0.1 --port 5174
```

### API Endpoints

- `GET /health` - check that the service is running
- `GET /summary` - return dashboard statistics and metrics
- `POST /predict` - return a performance prediction

## Evaluation

The model is trained on an augmented version of the sample dataset and evaluated with a holdout test split. The dashboard reports:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion matrix

## Design Reference

The layout follows the supplied screenshot for spacing, strong hero cards, pill-style navigation, and layered panels. It is adapted for an academic analytics project rather than a marketing page.

## Notes

- The project uses a hybrid ensemble approach suitable for academic evaluation.
- A sample dataset is included to make further development easier.
- You can replace the sample data with your own student records later.
