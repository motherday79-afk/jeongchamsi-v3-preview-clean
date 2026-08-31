const VALID_BADGE_KEYS = new Set([
  'noon-signal','midnight','weekman','superhero','first-participation','citizen-choice',
  'first-penguin','influencer','policy-proposer','opinion-leader','top-community','top-itsme','jungchamsi-partner'
]);

function automaticBadgeKeys(user = {}, activity = {}) {
  const earned = new Set();
  if (user?.role === 'admin') VALID_BADGE_KEYS.forEach(key => earned.add(key));
  if (user?.role === 'partner') earned.add('jungchamsi-partner');

  const events = activity?.badgeEvents && typeof activity.badgeEvents === 'object' ? activity.badgeEvents : {};
  const participationEvents = ['comment','poll-vote','generation-vote','national-evaluation','academy-apply','post-save'];
  if (participationEvents.some(key => Number(events[key] || 0) > 0)) earned.add('first-participation');
  if (Number(events['poll-vote'] || 0) > 0 || Object.keys(activity?.pollVotes || {}).length > 0) earned.add('citizen-choice');
  return earned;
}

async function isBadgeUnlocked(user = {}, activity = {}, badgeKey = '') {
  const key = String(badgeKey || '');
  if (!VALID_BADGE_KEYS.has(key)) return false;
  if ((activity?.grantedBadges || []).map(String).includes(key)) return true;
  return automaticBadgeKeys(user, activity).has(key);
}

module.exports = { VALID_BADGE_KEYS, automaticBadgeKeys, isBadgeUnlocked };
