require('dotenv').config()
// Import the Google Cloud client library and create a client.
const { DataCatalogClient: DC } = require('@google-cloud/datacatalog').v1;
const datacatalog = new DC();

const projectId = process.env.PROJECT_ID;
const datasetId = process.env.DATASET_ID;
const tableId = process.env.TABLE_ID;
const location = 'europe-west2';


async function main() {

};

//main();