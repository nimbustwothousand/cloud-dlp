/*
		SINGLE USE FUNCTION
		CREATES A TAG TEMPLATE FOR EVERY INFOTYPE THAT IS BEING CHECKED FOR
		CHANGE infoTypesArr TO ADD OR REMOVE INBUILT INFOTYPES
*/

require('dotenv').config()
// Import the Google Cloud client library and create a client.
const { DataCatalogClient: DC } = require('@google-cloud/datacatalog').v1;
const datacatalog = new DC();

const projectId = process.env.PROJECT_ID;
const location = 'europe-west2';

async function main() {
	const infoTypesArr = ['ADVERTISING_ID', 'AGE', 'CREDIT_CARD_NUMBER', 'DATE', 'DATE_OF_BIRTH', 'DOMAIN_NAME', 'EMAIL_ADDRESS', 'ETHNIC_GROUP', 'FIRST_NAME', 'LAST_NAME', 'PERSON_NAME', 'GENDER', 'GENERIC_ID', 'IMEI_HARDWARE_ID', 'IP_ADDRESS', 'MAC_ADDRESS', 'MAC_ADDRESS_LOCAL', 'STREET_ADDRESS', 'SWIFT_CODE', 'URL', 'VEHICLE_IDENTIFICATION_NUMBER', 'UK_DRIVERS_LICENSE_NUMBER', 'UK_NATIONAL_INSURANCE_NUMBER'];

	infoTypesArr.forEach(i => createTagTemplate(i))
}

async function createTagTemplate(i) {
	let request;
	let response;
	const tagTemplateId = `pii_found_${i.toLowerCase()}`;
	const tagTemplate = {
		displayName: i,
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
	response = await datacatalog.createTagTemplate(request);
	const createdTagTemplate = response[0];
	console.log(`Created template: ${createdTagTemplate.name}`);
}
main()