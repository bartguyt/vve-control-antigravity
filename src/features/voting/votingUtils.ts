import type { Proposal } from '../../types/database';

export const getDecisionInfo = (proposal: Proposal, stat: any) => {
    if (!stat) return null;

    const totalEligible = stat.total_eligible_head || 0;
    const votesCast = stat.votes_cast_head || 0;
    const votesFor = stat.votes_for_head || 0;
    const votesAgainst = stat.votes_against_head || 0;
    const votesUncast = totalEligible - votesCast;

    let requiredFor = 0;
    let policyLabel = '';

    if (proposal.type === 'UNANIMOUS') {
        requiredFor = totalEligible;
        policyLabel = 'Unaniem (100%)';
    } else if (proposal.type === 'SPECIAL') {
        requiredFor = Math.ceil(totalEligible * (2 / 3));
        policyLabel = 'Gekwalificeerd (2/3)';
    } else {
        requiredFor = Math.floor(totalEligible / 2) + 1;
        policyLabel = 'Meerderheid (> 50%)';
    }

    const stillNeeded = Math.max(0, requiredFor - votesFor);
    const maxPossibleFor = votesFor + votesUncast;
    const isImpossible = maxPossibleFor < requiredFor;
    const isPassed = votesFor >= requiredFor;

    return {
        totalEligible,
        votesCast,
        votesFor,
        votesAgainst,
        votesUncast,
        requiredFor,
        stillNeeded,
        isImpossible,
        isPassed,
        policyLabel
    };
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'OPEN': return 'emerald';
        case 'ACCEPTED': return 'blue';
        case 'REJECTED': return 'red';
        case 'DRAFT': return 'gray';
        default: return 'gray';
    }
};
