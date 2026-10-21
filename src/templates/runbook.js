const { escapeXml: x } = require('./escapeXml');

module.exports = {
  key: 'runbook',
  name: 'Runbook',
  fields: [
    { name: 'title', label: 'Runbook title', required: true },
    { name: 'owner', label: 'Owning team or person', required: true },
    { name: 'date', label: 'Last reviewed', required: true },
  ],
  render(v) {
    return `
<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Owner: ${x(v.owner)}. Last reviewed: ${x(v.date)}.</p></ac:rich-text-body></ac:structured-macro>
<h2>Purpose</h2>
<p>When to use this runbook.</p>
<h2>Prerequisites</h2>
<ul><li><p>Access to ...</p></li></ul>
<h2>Procedure</h2>
<ol><li><p>Step one</p></li><li><p>Step two</p></li></ol>
<h2>Verification</h2>
<p>How to confirm the procedure worked.</p>
<h2>Rollback</h2>
<p>&nbsp;</p>`.trim();
  },
};
