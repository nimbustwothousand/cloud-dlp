// Instantiates a client
const dlp = new DLP.DlpServiceClient();

// The string to inspect
const string = 'Robert Frost';

// The project ID to run the API call under
// const projectId = 'my-project';

async function quickStart() {


	const minLikelihood = 'LIKELY';
	const maxFindings = 0;
	//const infoTypes = [{ name: 'FIRST_NAME' }, { name: 'US_STATE' }];
	const includeQuote = false;
	const item = { value: string };
	// Construct request
	const request = {
		parent: `projects/${projectId}/locations/global`,
		inspectConfig: {
			//infoTypes: infoTypes,
			minLikelihood: minLikelihood,
			limits: {
				maxFindingsPerRequest: maxFindings,
			},
			includeQuote: includeQuote,
		},
		item: item,
	};

	// Run request
	const [response] = await dlp.inspectContent(request);
	const findings = response.result.findings;
	if (findings.length > 0) {
		console.log('Findings:');
		findings.forEach(finding => {
			if (includeQuote) {
				console.log(`\tQuote: ${finding.quote}`);
			}
			console.log(`\tInfo type: ${finding.infoType.name}`);
			console.log(`\tLikelihood: ${finding.likelihood}`);
		});
	} else {
		console.log('No findings.');
	}
}
quickStart();