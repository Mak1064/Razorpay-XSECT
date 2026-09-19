export const opportunities = [
  {
    id: 'opt_1',
    title: 'Founding Engineer at stealth climate-tech',
    type: 'Opportunity',
    score: 94,
    area: 'Dogpatch · 1.2 mi',
    timing: 'Active this week',
    why: ['Your climate thesis', 'Systems architecture', 'Shared path via 2 trusted nodes'],
    color: 'mint',
    obscuredImage: '/images/obscured-1.jpg',
    revealedImage: '/images/revealed-1.jpg',
    realName: 'Sarah Jenkins',
    realRole: 'Founder & CEO',
    company: 'Stealth Climate',
    intent: 'Looking for a technical co-founder to build our core data platform.',
    mutualNodes: 2,
    status: 'open'
  },
  {
    id: 'opt_2',
    title: 'Product signal for public space infrastructure',
    type: 'XSECT',
    score: 88,
    area: 'SoMa · 2.4 mi',
    timing: 'Timing aligned',
    why: ['Urban systems + product', 'Complementary intent', 'Introduced by 1 trusted node'],
    color: 'amber',
    obscuredImage: '/images/obscured-2.jpg',
    revealedImage: '/images/revealed-2.jpg',
    realName: 'David Chen',
    realRole: 'Head of Product',
    company: 'UrbanScale',
    intent: 'Exploring the intersection of digital infrastructure and physical public spaces.',
    mutualNodes: 1,
    status: 'open'
  },
  {
    id: 'opt_3',
    title: 'Quietly assembling a research collective',
    type: 'XSECT',
    score: 79,
    area: 'Mission District · 3.1 mi',
    timing: 'Open for 10 days',
    why: ['Research practice overlap', 'Mutual curiosity signal', 'Place rhythm aligned'],
    color: 'violet',
    obscuredImage: '/images/obscured-3.jpg',
    revealedImage: '/images/revealed-1.jpg',
    realName: 'Elena Rostova',
    realRole: 'Independent Researcher',
    company: 'Self-employed',
    intent: 'Forming a small, high-trust group to study emergent organizational structures.',
    mutualNodes: 0,
    status: 'open'
  }
];

export const events = [
  {
    id: 'evt_1',
    title: 'Systems & Climate Salon',
    date: 'Thursday, 6:00 PM',
    location: 'Private Gallery, Pacific Heights',
    image: '/images/event-1.jpg',
    attendees: 24,
    matchedAttendees: 7,
    description: 'A curated evening for operators and researchers building resilient systems. Heavy overlap with your core intent areas.',
    host: 'Protected Professional #842',
    rsvpStatus: 'open'
  },
  {
    id: 'evt_2',
    title: 'Founders Breakfast: Hard Tech',
    date: 'Next Tuesday, 8:30 AM',
    location: 'Members Club, FiDi',
    image: '/images/event-2.jpg',
    attendees: 12,
    matchedAttendees: 4,
    description: 'Intimate breakfast discussion focused on hardware and deep tech commercialization.',
    host: 'Trusted Node (Alex M.)',
    rsvpStatus: 'waitlist'
  }
];

export const moments = [
  {
    id: 'mom_1',
    time: 'Just now',
    title: 'Intent convergence detected',
    desc: 'Your operating partner signal crossed with a protected climate systems profile. Timing is unusually clear.',
    score: 92,
    type: 'moment'
  },
  {
    id: 'mom_2',
    time: 'Yesterday · 17:42',
    title: 'A trusted path appeared',
    desc: 'Two people in your extended network independently referenced the same studio.',
    score: 84,
    type: 'path'
  },
  {
    id: 'mom_3',
    time: 'Mon · 11:05',
    title: 'Timing shifted',
    desc: 'A research collective near your orbit moved from exploring to actively forming.',
    score: 78,
    type: 'shift'
  }
];

export const missed = [
  {
    id: 'mis_1',
    time: '2 days ago',
    title: 'The climate operator you didn\'t see',
    desc: 'You and Protected Professional #416 were in the same orbit for 47 minutes. Their signal expired before your radar crossed.',
    area: 'SoMa · approximate',
    canRevisit: true
  },
  {
    id: 'mis_2',
    time: 'Last week',
    title: 'Missed event convergence',
    desc: 'Three people matching your exact search criteria attended a gathering you skipped.',
    area: 'Hayes Valley',
    canRevisit: false
  }
];

export const intelligenceQueries = [
  "Where is momentum building in my network?",
  "Who is one path away in climate tech?",
  "What changed this week in my orbit?",
  "I want an introduction to US enterprise solar companies"
];
