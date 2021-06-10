require('dotenv').config()
const DLP = require('@google-cloud/dlp')
const dlp = new DLP.DlpServiceClient()

const { BigQuery } = require('@google-cloud/bigquery')
const bigquery = new BigQuery()

const { DataCatalogClient } = require('@google-cloud/datacatalog')
const datacatalog = new DataCatalogClient()

const { PubSub } = require('@google-cloud/pubsub')
const pubsub = new PubSub()

const projectId = process.env.PROJECT_ID;
const datasetId = process.env.DATASET_ID;
const tableId = process.env.TABLE_ID;

const findingsProjectId = process.env.FINDINGS_PROJECT_ID;
const findingsDatasetId = process.env.FINDINGS_DATASET_ID;

const location = 'europe-west2';
const queryLimit = 5;

const dataset = bigquery.dataset(datasetId)
const table = dataset.table(tableId)

async function getRows() {
	const query = `select * from \`${projectId}.${datasetId}.${tableId}\` LIMIT ${queryLimit}`
	const options = {
		query: query
	};
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	const [rows] = await job.getQueryResults();
	const rowArray = formatRows(rows);

	return rowArray
}

async function formatRows(rows) {
	let rowArr = [];
	rows.forEach(r => {
		const fieldArr = [];
		const fieldValues = Object.values(r);
		fieldValues.forEach(f => {
			fieldString = f.toString();
			fieldArr.push({ stringValue: fieldString })
		})
		rowArr.push({ values: fieldArr })
	});
	return rowArr
}

async function getHeaders() {
	const [metadata] = await table.getMetadata();
	const headers = metadata.schema.fields;
	//console.log(headers)
	return headers;
};
//getHeaders()
async function constructTable() {
	const tbl = {};
	tbl.headers = await getHeaders();
	tbl.rows = await getRows();
	return tbl;
}

async function getFindings() {
	const minLikelihood = 'LIKELY';
	const maxFindings = 0;
	const includeQuote = true;
	const tbl = await constructTable();
	const item = { table: tbl };
	// Construct request
	const request = {
		parent: `projects/${projectId}/locations/${location}`,
		inspectConfig: {
			minLikelihood: minLikelihood,
			limits: {
				maxFindingsPerRequest: maxFindings,
			},
			includeQuote: includeQuote,
		},
		item: item,
	};

	const response = await dlp.inspectContent(request);
	const findings = response[0].result.findings;
	const fnd = {};
	if (findings.length > 0) {
		findings.forEach((finding, idx) => {
			fnd[idx] = {};
			if (includeQuote) { fnd[idx].value = finding.quote } else { fnd[idx].value = null }; // Text found
			fnd[idx].infoType = finding.infoType.name;
			fnd[idx].likelihood = finding.likelihood;
			fnd[idx].field = finding.location.contentLocations[0].recordLocation.fieldId.name;
		})
	}
	return fnd;
}
async function getTableExists(findingsTableId) {
	const findingsDataset = bigquery.dataset(findingsDatasetId)
	const findingsTable = findingsDataset.table(findingsTableId)

	const [exists] = await findingsTable.exists()
	return exists;
}

async function deleteTable(datasetId, tableId) {
	const d = bigquery.dataset(datasetId);
	const t = d.table(tableId);
	const [apiResponse] = await t.delete()
	return apiResponse
}

async function createTable(datasetId, tableId) {
	const d = bigquery.dataset(datasetId);
	const t = d.table(tableId);
	const response = await t.create();
	return response[0]
}

async function main() {
	const findings = await getFindings();
	if (findings == {}) { // There were no findings
		console.log('No findings.')
	} else {
		// check if a results table exists
		const findingsTableId = `DLP_findings-${datasetId}-${tableId}`;
		const exists = await getTableExists(findingsTableId); // BOOL
		if (exists) {
			const deleted = await deleteTable(findingsDatasetId, findingsTableId);
		}

		const findingsTable = await createTable(findingsDatasetId, findingsTableId);
	}
}
main()
