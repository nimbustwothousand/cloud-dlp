require('dotenv').config()
// Import the Google Cloud client library and create a client.
const { DataCatalogClient: DC } = require('@google-cloud/datacatalog').v1;
const datacatalog = new DC();

async function quickstart() {
	// Common fields.
	let request;
	let responses;

	const projectId = process.env.PROJECT_ID;
	const datasetId = process.env.DATASET_ID;
	const tableId = process.env.TABLE_ID;

	const location = 'europe-west2';

	// Create Fields.
	const fieldHasPII = {
		displayName: 'Has PII',
		type: {
			primitiveType: 'BOOL',
		},
	};

	const fieldPIIType = {
		displayName: 'PII type',
		type: {
			enumType: {
				allowedValues: [
					{
						displayName: 'EMAIL',
					},
					{
						displayName: 'PHONE NUMBER',
					},
					{
						displayName: 'NONE',
					},
				],
			},
		},
	};

	// Create Tag Template.
	const tagTemplateId = 'dlp_demo_tag_template';

	const tagTemplate = {
		displayName: 'DLP Tag PII Type PHONE NUMBER',
		fields: {
			has_pii: fieldHasPII,
			pii_type: fieldPIIType,
		},
	};

	const tagTemplatePath = datacatalog.tagTemplatePath(
		projectId,
		location,
		tagTemplateId
	);

	// Delete any pre-existing Template with the same name.
	try {
		request = {
			name: tagTemplatePath,
			force: true,
		};
		await datacatalog.deleteTagTemplate(request);
		console.log(`Deleted template: ${tagTemplatePath}`);
	} catch (error) {
		console.log(`Cannot delete template: ${tagTemplatePath}`);
	}

	// Create the Tag Template request.
	const locationPath = datacatalog.locationPath(projectId, location);

	request = {
		parent: locationPath,
		tagTemplateId: tagTemplateId,
		tagTemplate: tagTemplate,
	};

	// Execute the request.
	responses = await datacatalog.createTagTemplate(request);
	const createdTagTemplate = responses[0];
	console.log(`Created template: ${createdTagTemplate.name}`);

	// Lookup Data Catalog's Entry referring to the table.
	responses = await datacatalog.lookupEntry({
		linkedResource:
			'//bigquery.googleapis.com/projects/' +
			`${projectId}/datasets/${datasetId}/tables/${tableId}`,
	});
	const entry = responses[0];
	console.log(`Entry name: ${entry.name}`);
	console.log(`Entry type: ${entry.type}`);
	console.log(`Linked resource: ${entry.linkedResource}`);

	// Attach a Tag to the table.
	const tag = {
		name: entry.name,
		template: createdTagTemplate.name,
		fields: {
			has_pii: {
				boolValue: true,
			},
			pii_type: {
				enumValue: {
					displayName: 'PHONE NUMBER',
				},
			},
		},
		column: 'phone'
	};

	request = {
		parent: entry.name,
		tag: tag,
	};

	// Create the Tag.
	await datacatalog.createTag(request);
	console.log(`Tag created for entry: ${entry.name}`);
}
quickstart();



