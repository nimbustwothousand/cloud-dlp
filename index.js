require('dotenv').config()
const DLP = require('@google-cloud/dlp')
const dlp = new DLP.DlpServiceClient()

const { BigQuery } = require('@google-cloud/bigquery')
const bigquery = new BigQuery()

const projectId = process.env.PROJECT_ID; // Only used for querying; the project is determined by the service account being used to authenticate. This script cannot create a results table in a different project.
const datasetId = process.env.DATASET_ID;
const tableId = process.env.TABLE_ID;

const findingsDatasetId = process.env.FINDINGS_DATASET_ID;

const location = 'europe-west2';
const queryLimit = 100;

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
	return headers;
};

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
	const fnd = [];
	if (findings.length > 0) {
		findings.forEach((finding, idx) => {
			const row = {};
			if (includeQuote) { row.value = finding.quote } else { row.value = null }; // Text found
			row.infoType = finding.infoType.name;
			row.likelihood = finding.likelihood;
			row.field = finding.location.contentLocations[0].recordLocation.fieldId.name;
			fnd.push(row)
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
	return 'Table already exists. Deleting table...'
}

async function createTable(datasetId, tableId) {
	const d = bigquery.dataset(datasetId);
	const t = d.table(tableId);
	const options = {
		schema: 'value:string,infoType:string,likelihood:string,field:string'
	};
	const response = await t.create(options);
	return response[0]
}

async function insertFindings(rows, findingsTableId) {
	const d = bigquery.dataset(findingsDatasetId);
	const t = d.table(findingsTableId);
	const options = {
		createInsertId: true,
		partialRetries: 3,
	};
	return t.insert(rows, options);
}

async function main() {
	const findings = await getFindings();
	if (findings == {}) { // There were no findings
		console.log('No findings.')
	} else {
		// check if a results table exists
		const findingsTableId = `DLP_findings-${datasetId}-${tableId}`;
		const exists = await getTableExists(findingsTableId); // BOOL
		// If it does exist, delete it
		if (exists) {
			const deleted = await deleteTable(findingsDatasetId, findingsTableId);
			console.log(deleted)
		}
		// Create a results table
		const findingsTable = await createTable(findingsDatasetId, findingsTableId);
		console.log('Created table: ', findingsTable.metadata.tableReference.tableId, 'in dataset: ', findingsDatasetId)
		// Insert the findings
		const success = await insertFindings(findings, findingsTableId);
		console.log('insertFindings() response: ', success)
	}

}
main()
