export const FIRST_NAMES = [
  "Aarav", "Aditi", "Akash", "Ananya", "Arjun", "Ayesha", "Dev", "Diya", "Farhan", "Gauri",
  "Harish", "Ira", "Ishaan", "Janvi", "Kabir", "Kavya", "Kiran", "Meera", "Mihir", "Naina",
  "Neel", "Nisha", "Omar", "Pallavi", "Pranav", "Priya", "Rahul", "Rhea", "Rohan", "Saanvi",
  "Sameer", "Sana", "Shreya", "Siddharth", "Simran", "Tanvi", "Varun", "Vedika", "Vihaan", "Zoya",
  "Amelia", "Daniel", "Elena", "Ethan", "Grace", "Hugo", "Isabella", "James", "Leila", "Lucas",
  "Maya", "Noah", "Olivia", "Sofia", "Theo", "Yuki", "Mateo", "Chloe", "Amina", "Liam",
] as const;

export const LAST_NAMES = [
  "Agarwal", "Bajaj", "Banerjee", "Bhat", "Chandra", "Chopra", "Das", "Desai", "Fernandes", "Gupta",
  "Iyer", "Jain", "Joshi", "Kapoor", "Khan", "Kulkarni", "Malhotra", "Mehta", "Menon", "Mishra",
  "Nair", "Patel", "Rao", "Reddy", "Roy", "Saxena", "Sen", "Shah", "Sharma", "Singh",
  "Srinivasan", "Thomas", "Verma", "Williams", "Chen", "Garcia", "Kim", "Martin", "Okafor", "Silva",
] as const;

export const INDUSTRIES = [
  "Fintech", "Healthtech", "SaaS", "Climate tech", "Consumer", "AI/ML", "Edtech", "D2C", "Logistics", "Media",
] as const;

export type RoleKind =
  | "founder" | "cto" | "product" | "design" | "engineer" | "investor" | "recruiter"
  | "freelancer" | "consultant" | "lawyer" | "marketing" | "sales" | "researcher" | "operator";

export const ROLE_KINDS: RoleKind[] = [
  "founder", "engineer", "product", "founder", "cto", "design", "investor", "engineer",
  "recruiter", "freelancer", "consultant", "marketing", "sales", "operator", "researcher", "lawyer",
];

export const ROLE_DATA: Record<RoleKind, { role: string; skills: string[]; intent: string; want: string; offer: string }> = {
  founder: { role: "Founder & CEO", skills: ["Fundraising", "Strategy", "Product", "Leadership", "Hiring", "GTM"], intent: "Building a category-defining company and meeting people who can accelerate its next stage.", want: "investor", offer: "partnership" },
  cto: { role: "Co-founder & CTO", skills: ["System Design", "TypeScript", "AI/ML", "Cloud", "Engineering Leadership", "Hiring"], intent: "Scaling a strong engineering team and exchanging practical architecture insight.", want: "freelancer", offer: "hiring" },
  product: { role: "Senior Product Manager", skills: ["Product Strategy", "Analytics", "User Research", "Roadmapping", "B2B SaaS", "Growth"], intent: "Looking for ambitious products where customer insight can unlock durable growth.", want: "job", offer: "expertise" },
  design: { role: "Product Design Lead", skills: ["Product Design", "Figma", "Design Systems", "User Research", "Prototyping", "Brand"], intent: "Collaborating with thoughtful teams on useful, accessible digital products.", want: "client", offer: "freelancing" },
  engineer: { role: "Staff Software Engineer", skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Cloud", "System Design"], intent: "Open to technically demanding products and early-stage collaboration.", want: "job", offer: "expertise" },
  investor: { role: "Investor", skills: ["Venture Capital", "Fundraising", "Due Diligence", "Strategy", "Fintech", "SaaS"], intent: "Meeting high-conviction founders and helping strong teams reach the right capital.", want: "introduction", offer: "investment" },
  recruiter: { role: "Technology Recruiter", skills: ["Talent Strategy", "Executive Search", "Hiring", "Interview Design", "Sourcing"], intent: "Connecting high-calibre builders with teams where they can do their best work.", want: "client", offer: "hiring" },
  freelancer: { role: "Independent Product Engineer", skills: ["React", "Node.js", "Product", "Prototyping", "UX", "APIs"], intent: "Available for focused product builds with clear outcomes and collaborative teams.", want: "client", offer: "freelancing" },
  consultant: { role: "Strategy Consultant", skills: ["Strategy", "Market Research", "Operations", "GTM", "Pricing", "Analytics"], intent: "Helping growing businesses make sharper market and operating decisions.", want: "client", offer: "consulting" },
  lawyer: { role: "Startup Counsel", skills: ["Corporate Law", "Contracts", "Fundraising", "Compliance", "Data Privacy"], intent: "Helping founders navigate fundraising, commercial agreements, and responsible growth.", want: "client", offer: "services" },
  marketing: { role: "Growth Marketing Lead", skills: ["Growth", "Performance Marketing", "Content", "SEO", "Analytics", "Brand"], intent: "Seeking teams ready to build an evidence-led, repeatable growth engine.", want: "job", offer: "consulting" },
  sales: { role: "Enterprise Sales Director", skills: ["Enterprise Sales", "GTM", "Partnerships", "Negotiation", "SaaS", "Leadership"], intent: "Building relationships around complex B2B growth and market expansion.", want: "introduction", offer: "introductions" },
  researcher: { role: "Applied AI Researcher", skills: ["Machine Learning", "NLP", "Python", "Research", "Responsible AI", "Data"], intent: "Exploring applied research collaborations with measurable real-world value.", want: "partnership", offer: "expertise" },
  operator: { role: "Business Operations Lead", skills: ["Operations", "Finance", "Strategy", "Program Management", "Hiring", "Analytics"], intent: "Helping fast-moving teams turn strategy into reliable execution.", want: "job", offer: "expertise" },
};

export const COMPANIES = [
  "Asterloop", "Banyan Grid", "CedarPay", "Driftwell", "Ember Health", "FluxCart", "GreenArc",
  "Harbor AI", "Indigo Labs", "Juniper Cloud", "Kiteworks", "LumenRoute", "Mosaic Earth",
  "Northstar Systems", "OrbitLearn", "Pinecone Commerce", "Quarry Labs", "Riverline",
  "SignalNest", "Tandem Health", "Umbra Media", "Vela Mobility", "Willow Finance", "ZephyrStack",
  "Stealth startup", "Stealth startup", "Stealth startup",
] as const;

export const ORG_NAMES = [
  "Asterloop Labs", "Banyan Grid", "CedarPay", "Driftwell Studio", "Ember Health", "FluxCart",
  "GreenArc Climate", "Harbor AI", "Indigo Ventures", "Juniper Cloud", "Kiteworks Collective",
  "LumenRoute", "Mosaic Earth", "Northstar Seed Fund", "OrbitLearn", "Pinecone Commerce",
  "Quarry Product Studio", "Riverline Capital", "SignalNest", "Tandem Health",
  "Founders Commons", "Design Operators Guild", "Climate Builders Circle", "SaaS Leaders Network",
] as const;

export const MESSAGE_SEQUENCES = [
  ["Thanks for connecting. Your work sounds closely related to a problem we are exploring.", "Likewise. Happy to compare notes and see where there is useful overlap.", "Would a short call next week work?", "Yes, Tuesday afternoon is good for me."],
  ["Great to connect after the event.", "I enjoyed our conversation about building durable teams.", "I can share the hiring framework I mentioned.", "That would be very useful, thank you."],
  ["Your current focus caught my attention.", "Thanks. We are actively looking for the right collaborator.", "I may know someone relevant and can make an introduction.", "I would appreciate that. I can send a short context note."],
] as const;
