import yaml
import subprocess
import os
import sys

def run_step(workflow_path, step_name):
    with open(workflow_path, 'r') as f:
        data = yaml.safe_load(f)
    
    jobs = data.get('jobs', {})
    for job_name, job_data in jobs.items():
        steps = job_data.get('steps', [])
        for step in steps:
            if step.get('name') == step_name:
                run_script = step.get('run')
                if run_script:
                    print(f"Running step '{step_name}' from {workflow_path}...")
                    process = subprocess.run(['bash', '-c', run_script], text=True)
                    print(f"Step exited with code: {process.returncode}")
                    return process.returncode
    print(f"Step '{step_name}' not found in {workflow_path}")
    return -1

def test_tidy():
    print("\n=== Testing Tidy Check ===")
    print("Making librarian.yaml untidy...")
    with open('librarian.yaml', 'r') as f:
        content = f.read()

    target = 'libraries:'
    insertion = """
  - name: google-zebra
    version: 0.1.0
    apis:
      - path: google/zebra/v1"""

    if target in content:
        content = content.replace(target, target + insertion, 1)
        with open('librarian.yaml', 'w') as f:
            f.write(content)
    else:
        print("Error: 'libraries:' not found in librarian.yaml")
        return -1

    print("Running librarian tidy...")
    subprocess.run(['librarian', 'tidy'], check=True)

    exit_code = run_step('.github/workflows/librarian_tidy.yml', 'Check for diff')

    print("Cleaning up...")
    subprocess.run(['git', 'checkout', 'librarian.yaml'], check=True)
    return exit_code

def test_generation():
    print("\n=== Testing Generation Check ===")
    print("Modifying copyright year in librarian.yaml...")
    with open('librarian.yaml', 'r') as f:
        content = f.read()
    
    parts = content.split('name: google-ads-admanager', 1)
    if len(parts) == 2:
        parts[1] = parts[1].replace('copyright_year: "2026"', 'copyright_year: "2027"', 1)
        content = 'name: google-ads-admanager'.join(parts)
        with open('librarian.yaml', 'w') as f:
            f.write(content)
    else:
        print("Error: 'google-ads-admanager' not found in librarian.yaml")
        return -1

    # Modify workflow in memory to run for single library
    with open('.github/workflows/generation_check.yaml', 'r') as f:
        data = yaml.safe_load(f)
    
    jobs = data.get('jobs', {})
    for job_name, job_data in jobs.items():
        steps = job_data.get('steps', [])
        for step in steps:
            if step.get('name') == 'Regenerate':
                run_script = step.get('run')
                if run_script:
                    run_script = run_script.replace('librarian generate --all', 'librarian generate google-ads-admanager')
                    step['run'] = run_script
                    break
    
    temp_workflow = 'temp_generation_check.yaml'
    with open(temp_workflow, 'w') as f:
        yaml.safe_dump(data, f)
        
    exit_code = run_step(temp_workflow, 'Regenerate')
    
    if os.path.exists(temp_workflow):
        os.remove(temp_workflow)
    
    print("Cleaning up...")
    subprocess.run(['git', 'checkout', 'librarian.yaml'], check=True)
    subprocess.run(['git', 'checkout', 'packages/google-ads-admanager'], check=True)
    # clean untracked files in packages/google-ads-admanager just in case
    subprocess.run(['git', 'clean', '-fd', 'packages/google-ads-admanager'], check=True)
    return exit_code

tidy_res = test_tidy()
gen_res = test_generation()

print(f"\nTidy check exit code: {tidy_res}")
print(f"Generation check exit code: {gen_res}")

if tidy_res != 1 or gen_res != 1:
    print("Verification FAILED!")
    sys.exit(1)
else:
    print("Verification PASSED!")
    sys.exit(0)
