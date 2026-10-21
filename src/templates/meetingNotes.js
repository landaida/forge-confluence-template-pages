const { escapeXml: x } = require('./escapeXml');

module.exports = {
  key: 'meeting-notes',
  name: 'Meeting notes',
  fields: [
    { name: 'title', label: 'Meeting title', required: true },
    { name: 'owner', label: 'Facilitator', required: true },
    { name: 'date', label: 'Meeting date', required: true },
  ],
  render(v) {
    return `
<p><strong>Date:</strong> ${x(v.date)}<br /><strong>Facilitator:</strong> ${x(v.owner)}</p>
<h2>Attendees</h2>
<ul><li><p>${x(v.owner)}</p></li></ul>
<h2>Agenda</h2>
<ol><li><p>Topic 1</p></li></ol>
<h2>Notes</h2>
<p>&nbsp;</p>
<h2>Action items</h2>
<ac:task-list>
<ac:task><ac:task-status>incomplete</ac:task-status><ac:task-body>First action item</ac:task-body></ac:task>
</ac:task-list>`.trim();
  },
};
