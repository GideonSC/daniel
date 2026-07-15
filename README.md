# Predictive Intelligence System for Analyzing and Visualizing Student Academic Performance

This project is a predictive intelligence system for analyzing and visualizing student academic performance using academic and engagement features. It includes a working FastAPI backend, a hybrid machine learning model, and a React + Vite frontend dashboard inspired by the provided poster-style UI sample.

## Overview

The system uses a combined approach rather than a single algorithm:

- `Decision Tree` for a simple and explainable baseline
- `Random Forest` for stronger prediction accuracy and reduced overfitting
- `MLP Neural Network` for learning non-linear patterns
- `Voting Ensemble` to combine model predictions into a final result

The dashboard shows:

- dataset summary statistics
- category distribution
- prediction form
- predicted performance category and confidence
- model evaluation metrics
- confusion matrix

The project is designed as a final-year Computer Science project with a Python backend, analytics layer, and a web dashboard for visualization.

## Features

The model can use inputs such as:

- Attendance percentage
- Assignment scores
- Quiz scores
- Test scores
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

### Windows command scripts
Use these helper scripts from the project root.

- `setup.cmd` — prepare Python and frontend dependencies
- `train-model.cmd` — train the model and save the artifact
- `run-backend.cmd` — start the FastAPI backend on port `8002`
- `run-frontend.cmd` — start the React/Vite frontend on port `5174`
- `start.cmd` — run setup and launch backend/frontend windows

> `setup.cmd` has been verified to create the `.venv` and install `frontend/node_modules` if needed.

### Run the project step by step
1. Open CMD in `c:\Users\saleh\OneDrive\Desktop\project`
2. Run:

```bat
setup.cmd
```

3. Train the model:

```bat
train-model.cmd
```

4. Start the backend:

```bat
run-backend.cmd
```

5. In a second command prompt, start the frontend:

```bat
run-frontend.cmd
```

6. Open the dashboard:

```text
http://127.0.0.1:5174
```

### One-command startup
To start both backend and frontend together, run:

```bat
start.cmd
```

### Manual start if needed
```bat
.venv\Scripts\activate
python -m app.train
python -m uvicorn app.api:app --reload --port 8002
cd frontend
npm run dev -- --host 127.0.0.1 --port 5174
```

### API Endpoints
- `GET /health` — checks that the service is running
- `GET /summary` — returns dashboard statistics and metrics
- `POST /predict` — returns a performance category prediction

## Evaluation Approach

The model is trained on an augmented version of the sample dataset and evaluated using a holdout test split. The dashboard reports:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion matrix

## Design Reference

The dashboard uses the supplied image as a visual reference for spacing, bold hero presentation, pill-style navigation, and colorful layered cards. It is adapted for an academic analytics product instead of a marketing landing page.

## Notes

- The project uses a hybrid ensemble design suitable for academic evaluation.
- A sample dataset is included to make it easier to continue development later.
- You can replace the sample data with your real student dataset when ready.
