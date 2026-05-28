import { Express, Request, Response } from "express";
import { Exam, ExamDay, AuthFunction, available_lists } from "./exams";

interface EventData {
    summary: string; // name
    description: string; // extra info
    start: string;
    end: string;
}

const courseNames = {
    'BI': "Biologie",
    'CH': "Chemie",
    'IF': "Informatik",
    'M': "Mathe",
    'PH': "Physik",
    'PXM': "Pjk. Mathe",
    'D': "Deutsch",
    'E': "Englisch",
    'L': "Latein",
    'F': "Französisch",
    'S0': "Spanisch (S0)",
    'S9': "Spanisch (S9)",
    'EK': "Erdkunde",
    'GE': "Geschichte",
    'PL': "Philosophie",
    'ER': "Religion (Ev.)",
    'KR': "Religion (Kath.)",
    'SW': "Sozialwissenschaften",
    'IP': "IP",
    'KU': "Kunst",
    'LI': "Literatur",
    'MU': "Musik",
    'SP': "Sport",
};

const startTimes: string[] = [
    "075000", // 1 Stunde 7:50
    "084000", // 2 Stunde 8:40
    "094000", // 3 Stunde 9:40
    "103000", // 4 Stunde 10:30
    "113000", // 5 Stunde 11:30
    "122000", // 6 Stunde 12:20
    "131000", // 7 Stunde 13:10
    "140000", // 8 Stunde 14:00
    "144500", // 9 Stunde 14:45
    //"153000", // 10 Stunde 7:50
];

const endTimes: string[] = [
    "083500", // 1 Stunde 8:35
    "092500", // 2 Stunde 9:25
    "102500", // 3 Stunde 10:25
    "111500", // 4 Stunde 11:15
    "121500", // 5 Stunde 12:15
    "130500", // 6 Stunde 13:05
    "135500", // 7 Stunde 13:55
    "144500", // 8 Stunde 14:45
    "153000", // 9 Stunde 15:30
    //"161500", // 10 Stunde 16:15
];

function stringToDate(str: string): Date { // thank you past me
    const s = str.split(".");
    return new Date(`${s[2]}-${s[1]}-${s[0]}T16:00:00`);
}

function serializeExamDay(day: ExamDay, exam: Exam, sdate: Date): string {
    const starth = Number.parseInt(day.timeframe[0]);
    const endh = Number.parseInt(day.timeframe[7]);

    const start = `${dateToYearString(sdate)}T${startTimes[starth-1]}`;
    const end = `${dateToYearString(sdate)}T${endTimes[endh-1]}`;

    const split = exam.course.split("-")
    const summary = `${courseNames[split[0]]} ${split[1]}`;
    const description = `Lehrer: ${exam.teacher}\\nEs schreiben: ${exam.people}/${exam.max_people}`;

    // console.log(start);
    // console.log(end);
    // console.log(summary);
    // console.log(description);

    const data = {
        start: start,
        end: end,
        summary: summary,
        description: description,
    } as EventData;

    return serializeEvent(data);
}

function serializeEvent(data: EventData): string { // who needs npm anyway?
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Kirillathome//DSBScraper//DE
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:Europe/Berlin
BEGIN:STANDARD
DTSTART:16011028T030000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:16010325T020000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:${genUID(data)}@fnak.dev
LOCATION:Stiftisches Gymnasium Düren
GEO:50.79987674325381;6.481538108115103
SUMMARY:${data.summary}
DESCRIPTION:${data.description}
CLASS:PUBLIC
DTSTART;TZID=Europe/Berlin:${data.start}
DTEND;TZID=Europe/Berlin:${data.end}
DTSTAMP:${dateToEventString(new Date())}Z
END:VEVENT
END:VCALENDAR`;
} // I will just pretend that this method doesn't doxx me

function genUID(data: EventData): string {
    return new Date().getTime().toString() + data.start; // works ok ig
}

export function dateToEventString(date: Date): string {
    const year = dateToYearString(date);
    const time = dateToTimeString(date);
    return `${year}T${time}`;
}

function dateToYearString(date: Date): string {
    const year = date.getFullYear();
    const month = addZeroIfSmall(date.getMonth() + 1);
    const day = addZeroIfSmall(date.getDate());
    return `${year}${month}${day}`;
}

function dateToTimeString(date: Date): string {
    const hour = addZeroIfSmall(date.getHours());
    const minutes = addZeroIfSmall(date.getMinutes());
    const seconds = addZeroIfSmall(date.getSeconds());
    return `${hour}${minutes}${seconds}`;
}

function addZeroIfSmall(n: number): string{
    return n < 10 ? `0${n}` : n.toString();
}

export function initICalAPI(app: Express, authenthicateDSB: AuthFunction) {
    app.get('/ical/:list/:id', authenthicateDSB, (req: Request, res: Response) => { // so /api/v1/ical/Q1_1/IF-LK1.ics (SHOULD be unique per quarter)
        const list = req.params.list;
        const id = req.params.id;
        
        if (id.endsWith(".ics")) {
            const exam_name = id.substring(0, id.length-4);
            // console.log(`checking for ${exam_name}.`)

            for (const l of available_lists) {
                if (l.name === list) { 
                    for (const ed of l.exams) {
                        for (const e of ed.exams) {
                            if (e.course === exam_name) { // ...finally
                                res.setHeader("Content-Type", "text/calendar").setHeader("Content-Disposition", "inline").send(serializeExamDay(ed, e, stringToDate(ed.date)));
                                return;
                            }
                        }
                    }
                }
            }
        }
        res.sendStatus(400);
    });
    // console.log(serializeExamDay(available_lists[0].exams[0], available_lists[0].exams[0].exams[0], stringToDate(available_lists[0].exams[0].date)));
    app.options('/ical/:id', (_req: Request, res: Response) => {
        res.send();
    });

    console.log("ICal API init done.");
}