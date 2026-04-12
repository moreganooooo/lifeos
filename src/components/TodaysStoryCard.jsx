function buildStory(todayLevels, anchorData, todaySparks, currentStreak) {
  const checked = anchorData.checked.filter(Boolean).length;
  if (checked === 0) return null;

  const lit = [
    todayLevels.level1Lit && 'Health',
    todayLevels.level2Lit && 'Safety',
    todayLevels.level3Lit && 'Connection',
  ].filter(Boolean);

  const unlit = [
    !todayLevels.level1Lit && 'Health',
    !todayLevels.level2Lit && 'Safety',
    !todayLevels.level3Lit && 'Connection',
  ].filter(Boolean);

  const parts = [];

  if (lit.length === 3) {
    parts.push('Today you tended to Health, Safety, and Connection. Full spectrum day 🌅.');
  } else if (lit.length > 0) {
    parts.push(`Today you tended to ${lit.join(' and ')}.`);
  } else {
    parts.push(`You completed ${checked} anchor${checked !== 1 ? 's' : ''} today — that's something.`);
  }

  if (unlit.length > 0 && lit.length > 0) {
    parts.push(`${unlit[0]} is waiting for tomorrow 💜.`);
  }

  const sparkPart  = todaySparks > 0
    ? `You earned ${todaySparks} Spark${todaySparks !== 1 ? 's' : ''} ✨.`
    : '';
  const streakPart = currentStreak > 1
    ? `${currentStreak} days in a row 🔥.`
    : currentStreak === 1
    ? 'Day one — you showed up 💜.'
    : '';

  const ending = [sparkPart, streakPart].filter(Boolean).join(' ');
  if (ending) parts.push(ending);

  return parts.join(' ');
}

export default function TodaysStoryCard({ todayLevels, anchorData, todaySparks, currentStreak }) {
  const isAfter6pm = new Date().getHours() >= 18;
  const hasAnchors = anchorData.checked.some(Boolean);

  if (!isAfter6pm || !hasAnchors) return null;

  const story = buildStory(todayLevels, anchorData, todaySparks, currentStreak);
  if (!story) return null;

  const glowColor = todayLevels.level3Lit ? '#f472b6'
                  : todayLevels.level2Lit ? '#fb923c'
                  : todayLevels.level1Lit ? '#e879f9'
                  : null;

  return (
    <div
      className="story-card"
      style={glowColor ? { borderColor: glowColor, boxShadow: `0 0 16px ${glowColor}22` } : {}}
    >
      <div className="story-hd">📖 Today's Story</div>
      <div className="story-txt">{story}</div>
    </div>
  );
}
