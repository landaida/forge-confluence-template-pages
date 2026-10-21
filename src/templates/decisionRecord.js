const { escapeXml: x } = require('./escapeXml');

module.exports = {
  key: 'decision-record',
  name: 'Decision record',
  fields: [
    { name: 'title', label: 'Decision title', required: true },
    { name: 'owner', label: 'Decision owner', required: true },
    { name: 'date', label: 'Decision date', required: true },
  ],
  render(v) {
    return `
<table><tbody>
<tr><th>Status</th><td><ac:structured-macro ac:name="status"><ac:parameter ac:name="title">PROPOSED</ac:parameter><ac:parameter ac:name="colour">Yellow</ac:parameter></ac:structured-macro></td></tr>
<tr><th>Owner</th><td>${x(v.owner)}</td></tr>
<tr><th>Date</th><td>${x(v.date)}</td></tr>
</tbody></table>
<h2>Context</h2>
<p>What problem are we solving, and what constraints apply?</p>
<h2>Options considered</h2>
<ol><li><p>Option A</p></li><li><p>Option B</p></li></ol>
<h2>Decision</h2>
<p>&nbsp;</p>
<h2>Consequences</h2>
<p>&nbsp;</p>`.trim();
  },
};
