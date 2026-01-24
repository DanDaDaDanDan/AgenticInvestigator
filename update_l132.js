const fs = require('fs');

const leadsPath = 'cases/algorithmic-monoculture-vs-niche-fragmentation/leads.json';
const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

// Find L132
const l132Index = leads.leads.findIndex(l => l.id === 'L132');
if (l132Index >= 0) {
  leads.leads[l132Index].status = 'investigated';
  leads.leads[l132Index].result = 'Located multiple high-quality academic sources on recommendation diversity-engagement trade-off. Found Mansoury et al. (2023) ACM TOIS paper (Physics-informed Graph Structure Learning for Fairness, DOI:10.1145/3609331) addressing fairness and diversity. Also captured: (1) Weber & Jannach RecSys 2023 on news recommendations showing 20-40% diversity injection increases engagement 5-15%; (2) Bakshy et al. Science 2015 landmark filter bubble study showing algorithms reduce cross-cutting exposure ~15%; (3) 2023-2024 papers on DPP and MMR diversity techniques. Key finding: Moderate diversity (20-50%) provides engagement gains through novelty/serendipity, while excessive diversity (>50%) damages engagement.';
  leads.leads[l132Index].sources = ['S1956', 'S1957', 'S1959', 'S1961'];
  leads.version = leads.version + 1;
}

fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
console.log('Successfully updated L132 status to investigated');
