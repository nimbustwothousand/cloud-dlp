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
const location = 'europe-west2';
const queryLimit = 5;

const dataset = bigquery.dataset(datasetId)
const table = dataset.table(tableId)

async function getRows() {
	const query = `select * from \`${projectId}.${datasetId}.${tableId}\` LIMIT ${queryLimit}`

	// For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
	const options = {
		query: query
	};
	// Run the query as a job
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	// Wait for the query to finish
	const [rows] = await job.getQueryResults();

	const rowArray = formatRows(rows);

	return rowArray
}
//getRows()

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

async function createDlpJob() {
	const minLikelihood = 'LIKELY';
	const maxFindings = 0;
	const includeQuote = false;
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
	try {
		const [response] = await dlp.inspectContent(request)
		const findings = response.result.findings;
		if (findings.length > 0) {
			console.log('Findings:');
			console.log('PII Type: ', findings[0].infoType.name) // PII Type
			console.log('Likelihood: ', findings[0].likelihood) // Likelihood
			console.log('Field: ', findings[0].location.contentLocations[0].recordLocation.fieldId.name) //field name
			findings.forEach((finding, idx) => {
				//if (!finding.infoType) { console.log(finding) }
				console.log('Finding number: ', idx)
				console.log(`\tInfo type: ${finding.infoType.name}`);
				console.log(`\tLikelihood: ${finding.likelihood}`);
				console.log(`\tLocation: ${finding.location.contentLocations[0].recordLocation.fieldId.name}`)
			});
		} else {
			console.log('No findings.');
		}
	} catch (err) {
		console.error(err)
	}
}
createDlpJob();