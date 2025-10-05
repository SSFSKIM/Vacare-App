#!/usr/bin/env python3
"""
Run full calibration pipeline locally and save results.
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/routes/career-recommendation"

def log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def call_endpoint(method, endpoint, data=None, timeout=1200):
    """Call API endpoint with timeout."""
    url = f"{BASE_URL}{endpoint}"
    log(f"Calling {method} {endpoint}...")

    try:
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        else:
            response = requests.post(url, json=data, timeout=timeout)

        response.raise_for_status()
        result = response.json()
        log(f"✓ Success: {endpoint}")
        return result
    except requests.exceptions.Timeout:
        log(f"✗ Timeout after {timeout}s: {endpoint}")
        return None
    except Exception as e:
        log(f"✗ Error: {endpoint} - {e}")
        return None

def main():
    results = {
        "timestamp": datetime.now().isoformat(),
        "steps": {}
    }

    # Step 1: Bootstrap validation dataset
    log("=" * 60)
    log("Step 1/5: Bootstrap Validation Dataset")
    log("=" * 60)
    bootstrap_result = call_endpoint("POST", "/bootstrap-validation", {
        "dataset_name": "career-validation-csv",
        "sample_occupations": 200,
        "positives_per_occupation": 1,
        "negatives_per_positive": 3,
        "topn_abilities": 6,
        "topn_skills": 6,
        "topn_knowledge": 6,
        "include_interests": True,
        "noise_std": 5
    })
    results["steps"]["bootstrap"] = bootstrap_result

    if not bootstrap_result:
        log("Bootstrap failed. Aborting.")
        return results

    # Step 2: Optimize weights
    log("\n" + "=" * 60)
    log("Step 2/5: Optimize Weights (this may take 10-20 minutes)")
    log("=" * 60)
    start_time = time.time()
    weights_result = call_endpoint("POST", "/optimize-weights", {
        "dataset_name": "career-validation-csv"
    }, timeout=1800)  # 30 minute timeout
    elapsed = time.time() - start_time
    log(f"Optimize weights took {elapsed:.1f} seconds")
    results["steps"]["optimize_weights"] = weights_result

    if not weights_result:
        log("WARNING: Optimize weights failed/timed out. Continuing with defaults...")

    # Step 3: Calibrate thresholds
    log("\n" + "=" * 60)
    log("Step 3/5: Calibrate Thresholds")
    log("=" * 60)
    start_time = time.time()
    calibrate_result = call_endpoint("POST", "/calibrate", {
        "dataset_name": "career-validation-csv",
        "importance_candidates": [60, 70, 80, 85, 90],
        "ratio_candidates": [0.5, 0.6, 0.7, 0.8, 0.85],
        "top_k": 40
    }, timeout=1800)
    elapsed = time.time() - start_time
    log(f"Calibrate thresholds took {elapsed:.1f} seconds")
    results["steps"]["calibrate"] = calibrate_result

    if not calibrate_result:
        log("WARNING: Calibrate thresholds failed/timed out. Continuing...")

    # Step 4: Calibrate scores (Platt scaling)
    log("\n" + "=" * 60)
    log("Step 4/5: Calibrate Scores (Platt Scaling)")
    log("=" * 60)
    start_time = time.time()
    scores_result = call_endpoint("POST", "/calibrate-scores", {
        "dataset_name": "career-validation-csv",
        "learning_rate": 0.01,
        "max_iter": 500
    }, timeout=1800)
    elapsed = time.time() - start_time
    log(f"Calibrate scores took {elapsed:.1f} seconds")
    results["steps"]["calibrate_scores"] = scores_result

    if not scores_result:
        log("WARNING: Calibrate scores failed/timed out. Continuing...")

    # Step 5: Get final calibration state
    log("\n" + "=" * 60)
    log("Step 5/5: Fetch Final Calibration State")
    log("=" * 60)
    final_state = call_endpoint("GET", "/calibration")
    results["steps"]["final_state"] = final_state

    # Save results
    log("\n" + "=" * 60)
    log("Saving Results")
    log("=" * 60)
    output_file = f"calibration_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    log(f"Results saved to: {output_file}")

    # Print summary
    log("\n" + "=" * 60)
    log("CALIBRATION SUMMARY")
    log("=" * 60)
    if final_state:
        log(f"Importance Threshold: {final_state.get('importance_critical_threshold')}")
        log(f"Min Requirement Ratio: {final_state.get('min_requirement_ratio')}")
        log(f"Dimension Weights: {final_state.get('dimension_weights')}")
        log(f"Combination Weights: {final_state.get('combination_weights')}")
        log(f"Score Calibration: {final_state.get('score_calibration')}")

    return results

if __name__ == "__main__":
    results = main()
    print("\n" + "=" * 60)
    print("CALIBRATION COMPLETE!")
    print("=" * 60)
