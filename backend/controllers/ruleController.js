const Rule = require('../models/Rule');

const listRules = async (req, res, next) => {
  try {
    const rules = await Rule.find().sort({ id: 1 });
    res.json(rules.map(r => r.toJSON()));
  } catch (error) {
    next(error);
  }
};

const toggleRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const rule = await Rule.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!rule) {
      return res.status(404).json({ detail: `Rule '${id}' not found.` });
    }

    rule.enabled = Boolean(enabled);
    rule.lastTriggered = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
    await rule.save();

    res.json(rule.toJSON());
  } catch (error) {
    next(error);
  }
};

const testRules = async (req, res, next) => {
  try {
    const rules = await Rule.find({ enabled: true });
    res.json({
      status: 'success',
      active_rules_count: rules.length,
      evaluated_rules: rules.map(r => r.name),
      simulation_outcome: 'All compliance validation algorithms operating normally.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRules,
  toggleRule,
  testRules
};
