const templates = [
  require('./meetingNotes'),
  require('./decisionRecord'),
  require('./runbook'),
];

const byKey = new Map(templates.map((t) => [t.key, t]));

module.exports = {
  all: templates,
  get: (key) => byKey.get(key),
};
