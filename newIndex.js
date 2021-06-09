require('dotenv').config()
const DLP = require('@google-cloud/dlp')
const { BigQuery } = require('@google-cloud/bigquery')
const { DataCatalogClient } = require('@google-cloud/datacatalog')
const { PubSub } = require('@google-cloud/pubsub')
const dlp = new DLP.DlpServiceClient()
const pubsub = new PubSub()
const bigquery = new BigQuery()
const datacatalog = new DataCatalogClient()

const projectId = process.env.PROJECT_ID;
const datasetId = process.env.DATASET_ID;
const tableId = process.env.TABLE_ID;
const location = 'europe-west2';
const queryLimit = 1000;

async function getJobDetails() {
	const jobName = 'projects/dpduk-developer-jack-gray/locations/europe-west2/dlpJobs/i-1010329011029021807'
	const job = await dlp.getDlpJob({ name: jobName })

	console.log(job)
}

const main = async function () {
	const dataset = bigquery.dataset(datasetId)
	const table = dataset.table(tableId)
	let fields;
	let columnData = {};

	const queryTable = (fieldname) => {
		const query = `select ${fieldname} from \`${projectId}.${datasetId}.${tableId}\` LIMIT ${queryLimit}`

		bigquery.query(query)
			.then(data => {
				console.log('querying the table with', fieldname);
				//data[0] is an object in the form [{ email: 'name@domain.co' }, { email: 'name@domain.co' }]
				columnData[fieldname] = data[0].map(v => { return Object.values(v)[0] })
				//console.log(columnData[fieldname])
				return columnData
			})
			.catch(err => console.error(err))
	}
	let data;
	await table.getMetadata((err, metadata, apiResponse) => {
		if (!err) {
			fields = metadata.schema.fields.map(f => { return f.name });
			fields.forEach(f => {
				queryTable(f)
			})
		} else { console.error(err) }
	})
}
main()