import { Express, Request, Response, NextFunction } from 'express';
import { parse } from 'node-html-parser';
import DSB from 'dsbapi';


interface Substitution {
    classes: string;
    hours: string;
    subject: string;
    usual_subject: string;
    room: string;
    replacement: string;
}

interface DayTimetable {
    date: string;
    day: string;
    messages: Array<string>;
    substitutions: Array<Substitution>;
}

interface Timetables {
    last_modified: string;
    day_one: DayTimetable;
    day_two: DayTimetable;
}


const user = 'REPLACEME';
const key = 'REPLACEME';
const dsb = new DSB(user, key); // dsb thing getter

let last_modified: string = "";

export const authenthicateDSB = (req: Request, res: Response, next: NextFunction) => {
    const h_user = req.headers.user;
    const h_key = req.headers.key;
    if (h_user === undefined || h_key === undefined) {
        res.status(401).json({ error: 'Unauthorized' });
    } else if (h_user === user && h_key === key) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden' });
    }
};

async function getLinks(): Promise<string[]> { // fill the list of links
    const links: Array<string> = [];
    const data = await dsb.fetch();
    const timetables = DSB.findMethodInData('timetable', data); // get data
    last_modified = timetables['data'][0]['date'];
    for (const timetable_data of timetables['data']) {
        if (timetable_data['title'] === "VSOnline") {
        for (const timetable_item of timetable_data['objects']) {
            links.push(timetable_item['url']);
        }
        }
    }
    return links;
}

async function parseHTML(links: Array<string>): Promise<Timetables> {

    const timetables = {} as Timetables;
    const day_one = {} as DayTimetable;
    const day_two = {} as DayTimetable;

    day_one.substitutions = [];
    day_two.substitutions = [];

    timetables.last_modified = last_modified;
    timetables.day_one = day_one;
    timetables.day_two = day_two;

    let date = "";
    let next = false;

    for (const link of links) {
        const data = await fetch(link);
        const decoder = new TextDecoder('iso-8859-1');
        const html = decoder.decode(await data.arrayBuffer());

        const root = parse(html);
        const title = root.querySelector('div.mon_title');

        if (title === null) {
        console.warn("akward...");
        continue;
    }

    const original_messages = root.querySelectorAll('td.info').map(m => m.innerText).toString().replaceAll("&nbsp;", "");
    const messages: Array<string> = [];

    let s = 0;
    for (let i = 0; i < original_messages.length - 1; i++) {
        if (original_messages[i] === "," && original_messages[i+1] !== " ") {
                messages.push(original_messages.slice(s, i));
                s = i + 1;
                continue;
        }
        if (original_messages[i] === "\r" && original_messages[i+1] === "\n") {
                messages.push(original_messages.slice(s, i));
                s = i + 2;
        }
    }

    if (s < original_messages.length - 1) {
        messages.push(original_messages.slice(s, original_messages.length));
    }


    if (date === "") {
        date = title.innerText.slice(0, title.innerText.lastIndexOf(".")+5);
        day_one.date = date;
        day_one.day = title.innerText[title.innerText.length-1] === ')' ? title.innerText.slice(title.innerText.lastIndexOf('.') + 6, -14) : title.innerText.slice(title.innerText.lastIndexOf('.') + 6);
        day_one.messages = messages;

    } else if (title.innerText.slice(0, title.innerText.lastIndexOf(".")+5) === date) {
        // but nobody came.
    } else {
        date = title.innerText.slice(0, title.innerText.lastIndexOf(".")+5);
        day_two.date = date;
        day_two.day = title.innerText[title.innerText.length-1] === ')' ? title.innerText.slice(title.innerText.lastIndexOf('.') + 6, -14) : title.innerText.slice(title.innerText.lastIndexOf('.') + 6);
        day_two.messages = messages;
        next = true;
    }


    const rows = root.querySelectorAll('tr.list.odd, tr.list.even');
    
    const substitutions: Array<Substitution> = [];
    rows.forEach(r => {
        const subst = {} as Substitution;
        r.childNodes.forEach((node, index) => {
            switch (index) {
                case 0:
                    subst.classes = node.innerText;
                    break;
                case 1:
                    subst.hours = node.innerText;
                    break;
                case 2:
                    subst.subject = node.innerText;
                    break;
                case 3:
                    subst.usual_subject = node.innerText;
                    break;
                case 4:
                    subst.room = node.innerText;
                    break;
                case 5:
                    subst.replacement = node.innerText === '&nbsp;' ? "---" : node.innerText;
                }
            });
        substitutions.push(subst);
    });
                
    if (!next) {
        day_one.substitutions = day_one.substitutions.concat(substitutions);
    } else {
        day_two.substitutions = day_two.substitutions.concat(substitutions);
    }

    }

    return timetables;
}

export function initDSBScraperAPI(app: Express) {
    app.get('/dsb', authenthicateDSB, async (_req: Request, res: Response) => {
        try {
            const links = await getLinks();
            const timetables = await parseHTML(links);
            res.json(timetables);
        } catch(e) {
            res.status(412).json({});
        }
    });
    app.get('/dsbdummy', authenthicateDSB, (_req: Request, res: Response) => {
        res.send();
    });
    app.options('/dsb', (_req: Request, res: Response) => {
      res.send();
    });
    app.options('/dsbdummy', (_req: Request, res: Response) => {
      res.send();
    });

    console.log("DSBScraper API init done.");
}
