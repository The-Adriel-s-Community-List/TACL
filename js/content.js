import { round, score } from './score.js';

const creatorPointMap = {
    deco: 1,
    featured: 2,
    epic: 3,
    legendary: 5,
    mythical: 10,
};

/**
 * Path to directory containing `_list.json` and all levels
 */
const defaultDir = '/data';

export async function fetchList(dir = defaultDir) {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchEditors(dir = defaultDir) {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        

        // Verification
        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}
export async function fetchCreatorLeaderboard() {
    const list = await fetchList();

    const creatorMap = {};

    list.forEach(([level, err]) => {
        if (err) return;

        // Se não tiver rating, vale 0 CP
const totalPoints =
    creatorPointMap[level.rating?.toLowerCase()] || 0;

        // Se não tiver criadores ou não valer pontos, ignora
        if (!level.creators || level.creators.length === 0 || totalPoints === 0)
            return;


        level.creators.forEach((creator) => {
            creatorMap[creator] ??= {
                creator,
                total: 0,
                levels: [],
            };

            creatorMap[creator].total += points;

            creatorMap[creator].levels.push({
                level: level.name,
                rating: level.rating,
                points,
                verification: level.verification,
            });
        });
    });
Object.values(creatorMap).forEach((creator) => {
    creator.levels.sort((a, b) => b.points - a.points);
});
    return Object.values(creatorMap)
        .map((creator) => ({
            ...creator,
            total: round(creator.total),
        }))
        .sort((a, b) => b.total - a.total);
}
