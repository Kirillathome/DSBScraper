import { Express, Request, Response } from "express";
import { AuthFunction } from "./exams";
import PDFParser from "pdf2json";


// actual api types
interface Lesson {
    subject: string,  // IF L1
    teacher: string,  // Ksr
    room: string,     // H219
    week?: string;    // WU
}

interface HourBlock {
    hour: number,     // 5
    duration: number, // 2
    lessons: Lesson[];
}

interface Day {
    name: string, // Mi
    blocks: HourBlock[];
}

interface Timetable {
    school: string,  // [redacted] (wow, I'm so good at this! surely another file will not leak this..!)
    address: string, // [redacted]
    changed: string, // 31.1.2026 16:54
    grade: string,   // Q1
    teachers: string, // Slt/Sas
    rows: number,    // 1
    days: Day[];
}

// parsing helper type
interface LineBox {
    hour: number,
    x: number,
    y: number,
}

interface OpenLesson {
    x: number,
    y: number,
    l: Lesson;
}
// fixed pdf parser types
interface Page {
    HLines: Line[];
    Texts: Text[];
}

interface Line {
    x: number;
    y: number;
    l: number;
}

interface Text {
    x: number;
    y: number;
    R: TextRun[];
}

interface TextRun {
    T: string,
}


interface TableData {
    name: string,
    path: string,
    available: boolean,
    table: Timetable,
}

const DAYS = 5; // I HOPE for YOUR sake you never have to increase this

const available_tables: TableData[] = [
    // {name: "Q1", path: "./pdf/Q1.pdf", available: true, table: {} as Timetable},
];

for (const l of available_tables) {
    if (!!l.available) {
        const parser = new PDFParser();

        parser.on("pdfParser_dataError", (errData) => {
            console.error(errData.parserError);
        });
        parser.on("pdfParser_dataReady", (pdfData) => {
            let master = {} as Timetable;
            master.rows = 0;
            pdfData.Pages.forEach((p) => {
                let t = {} as Timetable;
                parseJSON(p, master.rows, t);
                master.rows = t.rows;
                if (master.school === undefined) { // first run
                    master.school = t.school;
                    master.address = t.address;
                    master.changed = t.changed;
                    master.grade = t.grade;
                    master.teachers = t.teachers;
                    master.days = t.days;
                } else { // any other page
                    t.days.forEach((d, i) => {
                        // if a lesson gets wrapped between to pages, append it in a smart way
                        let last = master.days[i].blocks.at(-1);
                        if (!!last && !!d.blocks[0] && last.lessons[0].subject === d.blocks[0].lessons[0].subject) {
                            last.duration += d.blocks[0].duration;
                            d.blocks.splice(0, 1);
                            if (d.blocks.length > 0) {
                                master.days[i].blocks = master.days[i].blocks.concat(d.blocks);
                            }
                            return;
                        }

                        master.days[i].blocks = master.days[i].blocks.concat(d.blocks);
                    });
                }
            });
            l.table = master;
        });

        parser.loadPDF(l.path);
    }
}

function availableToJSON() {
    const arr: Array<{name: string, available: boolean}> = [];
    for (const l of available_tables) {
        arr.push({name: l.name, available: l.available});
    }
    return arr;
}

function parseJSON(p: Page, f: number, timetable: Timetable) {
    let day_pointer = -1;
    let i = 0;
    let hpos: number[] = [];
    let grid_data: LineBox[][] = [];
    let hour = 0;
    let lessons = 0;
    let current_block: HourBlock = {} as HourBlock;
    current_block.lessons = [];
    if (timetable.days === undefined) {
        timetable.days = new Array(DAYS);
    }
    let open_lessons: OpenLesson[] = []

    if (p.Texts.length < 1) {
        console.error("Failed parsing the PDF!");
        return;
    }

    for (let text of p.Texts) {
        let t = "";
        text.R.forEach((r: any) => {
            t += r.T;
        })
        t = t.replaceAll("%20", " ");
        t = t.replaceAll("%2C", ",");
		t = t.replaceAll("%3A", ":");
		t = t.replaceAll("%2F", "/");
		t = t.replaceAll("%C3%BC", "ü");
        // console.log(`[${i}]: ${t}`);
        
        if (day_pointer < 0) {
            switch (i) { // static metadata
                case 0:
                    timetable.school = t;
                    break;
                case 1:
                    timetable.address = t;
                    break;
                case 4:
                    timetable.changed = t.replace("  ", " "); // I love replacing    with  !
                    break;
                case 5:
                    timetable.grade = t;
                    break;
                case 6:
                    timetable.teachers = t;
                    break;
                default:
                    if (i < 7) {
                        break;
                    }
                    if (i - 7 < DAYS) { // we know this is a week day
                        if (timetable.days[i - 7] === undefined) {
                            timetable.days[i - 7] = {name: t, blocks: []} as Day;
                        }
                        i++;
                        continue
                    }
                    let n = Number.parseInt(t); // checking for rows
                    if (Number.isSafeInteger(n)) {
                        timetable.rows = n;
                        hpos[i - 7 - DAYS] = text.y;
                        i++;
                        continue
                    }
                    grid_data = parseHLines(p.HLines, hpos, f + 1); // when rows are finished, parse the grid using said row positions
                    // console.log(grid_data);
                    day_pointer += 1;
            }
        }
        i++;
        if (day_pointer >= 0) {
            while (hour < grid_data[day_pointer].length-1 && text.y > grid_data[day_pointer][hour+1].y) { // hour switching
                current_block.hour = grid_data[day_pointer][hour].hour;
                current_block.duration = grid_data[day_pointer][hour+1].hour - grid_data[day_pointer][hour].hour;
                timetable.days[day_pointer].blocks[hour] = current_block;
                current_block = {} as HourBlock;
                current_block.lessons = [];
                open_lessons = [];
                hour++;
                lessons = 0;
            }
            if (day_pointer < DAYS - 1 && text.x > grid_data[day_pointer+1][0].x) { // day switching
                if (current_block.lessons.length > 0) {
                    current_block.hour = grid_data[day_pointer][hour].hour;
                    if (hour < grid_data[day_pointer].length-1) {
                        current_block.duration = grid_data[day_pointer][hour+1].hour - grid_data[day_pointer][hour].hour;
                    } else {
                        current_block.duration = timetable.rows - grid_data[day_pointer][hour].hour + 1;
                    }
                    timetable.days[day_pointer].blocks[hour] = current_block;
                    current_block = {} as HourBlock;
                    current_block.lessons = [];
                    open_lessons = [];
                }
                hour = 0;
                lessons = 0;
                day_pointer++;

                timetable.days[day_pointer].blocks.push({} as HourBlock);
            }
            if (t.includes("Seite")) {
                if (current_block.lessons.length <= 0) {
                    break; // womp womp
                }

                // append the final block
                current_block.hour = grid_data[day_pointer][hour].hour;
                if (hour < grid_data[day_pointer].length-1) {
                    current_block.duration = grid_data[day_pointer][hour+1].hour - grid_data[day_pointer][hour].hour;
                } else {
                    current_block.duration = timetable.rows - grid_data[day_pointer][hour].hour + 1;
                }
                timetable.days[day_pointer].blocks[hour] = current_block;
                break;
            }
            
            // course cheking logic
            let c = t.at(-1);
            if (c === undefined) {
                c = "";
            }
            if (t.includes("AG_") || t.includes("PX") || (t.at(-2) === "L" || t.at(-2) === "G") && t.at(-3) === " " && Number.isSafeInteger(Number.parseInt(c))) {
                // console.log("pushing because ", t)
                current_block.lessons.length = lessons + 1;
                current_block.lessons[lessons] = {} as Lesson;
                current_block.lessons[lessons].subject = t.replace(".", "");
                let push = true;

                // special case handling
                for (const o of open_lessons) {
                    if (Math.abs(text.y - o.y) <= 0.2) {
                        o.l.subject = t;
                        // console.log("found existing special case! ", JSON.stringify(o.l))
                        current_block.lessons[lessons] = o.l;
                        push = false;
                    }
                }

                if (push) {
                    open_lessons.push({x: text.x, y: text.y, l: current_block.lessons[lessons]});
                }
                
                lessons++;
                continue;
            }

            // position based matching to lessons
            let push = true;
            for (const o of open_lessons) {
                if (Math.abs(text.y - o.y) <= 0.2) {
                    const x = Math.abs(text.x - o.x);
                    if (x <= 2) {
                        o.l.teacher = t;
                        push = false;
                        break;
                    }
                    if (x <= 4) {
                        push = false;
                        o.l.room = t;
                        break;
                    }
                    push = false;
                    o.l.week = t;
                }
            }
            // special case handling (right columns BEFORE subject because the pdf is fucked)
            if (push) {
                // console.log("running special case")
                let l = {} as Lesson;
                const x = Math.abs(text.x - open_lessons[0].x);
                if (x <= 2) {
                    l.teacher = t;
                }
                else if (x <= 4) {
                    l.room = t;
                } else {
                    l.week = t;
                }
                open_lessons.push({x: open_lessons[0].x, y: text.y, l: l});
            }
        }
    }
}

function parseHLines(hlines: Line[], hpos: number[], first: number): LineBox[][] {
    // parsing lines is one of the biggest coding warcrimes I ever did
    // this is a double array of day to hour to line info
    let a: LineBox[][] = new Array(DAYS);

    let day = 0;
    let hour = 0;
    let last_x = -1;
    let last_y = -1;

    a[day] = [];

    for (let h of hlines) {
        if (h.l > 6) { // hardcoded length
            continue;
        }
        if (h.x == last_x && h.y == last_y) { // most lines are doubled for whatever fucking reason
            continue;
        }
        if (h.x > last_x && last_x > -1) { // day switching
            day++;
            a[day] = [];
            hour = 0;
        }
        last_x = h.x;
        last_y = h.y;
        while (h.y - hpos[hour] > 0 && h.y - hpos[hour] < 25) { // multi-hour block handling
            hour++;
        }
        a[day].push({
            x: h.x,
            y: h.y,
            hour: hour + first,
        });
    }

    return a;
}

export function initTimetableAPI(app: Express, authenthicateDSB: AuthFunction) {
    app.get('/timetables/:id', authenthicateDSB, (req: Request, res: Response) => {
        const id = req.params.id;
        if (id === "index") {
            res.json(availableToJSON());
            return;
        }
        for (const l of available_tables) {
            if (l.name === id) {
                if (!!l.table) {
                    res.json(l.table);
                } else {
                    res.sendStatus(425);
                }
                return;
            }
        }
        res.sendStatus(400);
    });
    app.options('/timetables/:id', (_req: Request, res: Response) => {
        res.send();
    });

    console.log("Timetable API init done.");
}