// utils/dateUtils.js
const getDateRange = (period, startDate = null) => {
  const now = new Date();
  let start, end = now;

  switch (period) {
    case 'weekly':
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else {
        // Current week
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Sunday of this week
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      }
      break;

    case 'monthly':
      if (startDate) {
        start = new Date(startDate);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        // Current month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:
      throw new Error('Invalid period. Use "weekly" or "monthly"');
  }

  return { start, end };
};

const generateDateIntervals = (startDate, endDate, interval) => {
  const intervals = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const intervalStart = new Date(current);
    let intervalEnd;

    if (interval === 'weekly') {
      intervalEnd = new Date(current);
      intervalEnd.setDate(current.getDate() + 6);
      current.setDate(current.getDate() + 7);
    } else if (interval === 'monthly') {
      intervalEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    intervals.push({
      start: new Date(intervalStart),
      end: new Date(intervalEnd),
      label: interval === 'weekly' 
        ? `Week ${Math.ceil((intervalStart.getDate() + intervalStart.getDay()) / 7)}` 
        : intervalStart.toLocaleString('default', { month: 'short', year: 'numeric' })
    });
  }

  return intervals;
};

module.exports = { getDateRange, generateDateIntervals };