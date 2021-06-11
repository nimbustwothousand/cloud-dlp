### cloud-dlp

This project is a proof of concept for automatically scanning BigQuery tables for Info Types with Cloud Data Loss Prevention. It utilises the Google Cloud client libraries for BigQuery, DLP, and Data Catalog. Ultimately, this will be used to build a web application to perform these tasks entirely programmatically, but currently it requires some manual configuration of environment variables, and creation of a dataset to store the results of the scan.

## How to use

This project requires [npm](https://www.npmjs.com/). Pull the repository and run `npm install`.

The `/reference/` folder contains the code from quickstarts provided by Google in the documentation. I saved them here for easy reference, but they're not used in the project.

`/functions/createPIITagTemplates.js` is a single-use script that generates Data Catalog tag templates for all Info Types being scanned for. The same list of Info Types is also used in `index.js`, so there's some duplication that needs to be fixed as this project evolves. If you want to change the Info Types being scanned for, change it in both places.

`index.js` is a script that queries the table identified in the environment variables and saves the results of that scan to a new table in a chosen dataset. Run `node .` to run it.

`datacatalog.js` is a script that queries the results table and tags each column with the Info Types that were found; one tag per Info Type. Run `node datacatalog.js` to run it. You must run `/functions/createPIITagTemplates.js` first, or create the tags manually.

# Environment variables
You'll need to create a .env file with the following: 
```
GOOGLE_APPLICATION_CREDENTIALS="filepath/to-google-credentials.json" /* See https://cloud.google.com/docs/authentication/production for how to generate this file */
PROJECT_ID="your-project-id"
DATASET_ID="your-dataset-id" /* the dataset containing the data to be scanned and tagged */
TABLE_ID="your-table-id" /* the table containing the data to be scanned and tagged */
FINDINGS_DATASET_ID="your-findings-dataset-id" /* the dataset where you want to store the results of the DLP scan. Can be the same as the DATASET_ID. The script creates the table for storage and names it DLP_findings-${DATASET_ID}-${TABLE_ID}. If the table already exists, it will delete and recreate it. */
```

