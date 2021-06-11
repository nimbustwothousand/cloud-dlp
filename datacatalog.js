require('dotenv').config()
// Import the Google Cloud client library and create a client.
const { DataCatalogClient: DC } = require('@google-cloud/datacatalog').v1;
const datacatalog = new DC();

const { BigQuery } = require('@google-cloud/bigquery')
const bigquery = new BigQuery()

// The table that has been scanned, to which tags will be added
const projectId = process.env.PROJECT_ID;
const datasetId = process.env.DATASET_ID;
const tableId = process.env.TABLE_ID;
const location = 'europe-west2';

const dataset = bigquery.dataset(datasetId);
const table = dataset.table(tableId);

// The results table which contains the findings of the scan
const findingsDatasetId = process.env.FINDINGS_DATASET_ID;
const findingsTableId = `DLP_findings-${datasetId}-${tableId}`;

const findingsDataset = bigquery.dataset(findingsDatasetId)
const findingsTable = findingsDataset.table(findingsTableId)

// Functions
async function getEntry() {
	// The DataCatalog entry for the table that has been scanned, to which tags will be added
	const tableEntry = await datacatalog.lookupEntry({
		linkedResource:
			'//bigquery.googleapis.com/projects/' +
			`${projectId}/datasets/${datasetId}/tables/${tableId}`,
	});
	return tableEntry[0];
}

async function queryFindingsTable() {
	const query = `select * from \`${projectId}.${findingsDatasetId}.${findingsTableId}\``; // TODO: REMOVE THIS LIMIT
	const options = {
		query: query
	};
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);
	const [rows] = await job.getQueryResults();
	const tags = [];
	rows.forEach(r => {
		tags.push({ field: r.field, infoType: r.infoType })
	});
	const x = tags.map(t => { return `${t.field}_&_${t.infoType}` });
	const y = [...new Set(x)];
	const distinctRows = [];
	y.forEach(r => {
		const arr = r.split('_&_'); // ['email','EMAIL_ADDRESS']
		distinctRows.push({ field: arr[0], infoType: arr[1] })
	})
	return distinctRows;
}

function constructTag(finding, entry) {
	const tag = {
		name: entry.name,
		template: `projects/${projectId}/locations/${location}/tagTemplates/pii_found_${finding.infoType.toLowerCase()}`,
		fields: {
			has_pii: {
				boolValue: true,
			},
			pii_type: {
				stringValue: finding.infoType
			},
		},
		column: finding.field
	};
	return tag
}

async function main() {
	// Get the data catalog entry for the table
	const entry = await getEntry();
	// Query the results table for the found infotypes
	const findings = await queryFindingsTable(); // [{ field: 'email', infoType: 'DOMAIN_NAME' }, ...]
	// Tag the columns with the relevant infoType tags
	findings.forEach(async (finding) => {
		const tag = constructTag(finding, entry);
		const request = {
			parent: entry.name,
			tag: tag,
		};
		await datacatalog.createTag(request);
		console.log(`Tag created for ${finding.infoType} on column ${finding.field}`);
	})
};

main();

/*
const tagTemplateId = `pii_found_infotype_name`;
const tagTemplate = {
		displayName: INFOTYPE_NAME,
		fields: {
			has_pii: {
				displayName: 'Has PII',
				type: {
					primitiveType: 'BOOL'
				},
			},
			pii_type: {
				displayName: 'PII Type',
				type: {
					primitiveType: 'STRING'
				}
			}
		}
	}
*/