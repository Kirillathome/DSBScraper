import { Express, NextFunction, Request, Response } from "express";
import PDFParser from "pdf2json";

export type AuthFunction = (req: Request, res: Response, next: NextFunction) => void; // idk what expressjs wants from me

//#region exam scraper
export interface ExamDay {
	date: string,
	day: string,
	timeframe: string,
	exams: Array<Exam>,
}

export interface Exam {
	course: string, // BI-GK3
	teacher: string, // Lug
	people: number, // 10
	max_people: number, // 18
	length: string, // 2-stündig

}

interface ExamData {
    name: string,
    path: string,
    available: boolean,
    exams: Array<ExamDay>,
}

export const available_lists = [ // register here, you can just uncomment these parts and replace the names/paths if you need to
	// {name: "Q1_1", path: "./pdf/Q1_1.pdf", available: true, exams: []} as ExamData,
    // {name: "Q1_2", path: "./pdf/Q1_2.pdf", available: true, exams: []} as ExamData,
    // {name: "Q1_3", path: "./pdf/Q1_3.pdf", available: false, exams: []} as ExamData,
    // {name: "Q1_4", path: "./pdf/Q1_4.pdf", available: false, exams: []} as ExamData,
]

for (const l of available_lists) {
    if (!!l.available) {
        const parser = new PDFParser();

        parser.on("pdfParser_dataError", (errData) => {
            console.error(errData.parserError);
        });
        parser.on("pdfParser_dataReady", (pdfData) => {
        	pdfData.Pages.forEach((p) => parseJSON(p, l.exams));
        });

        parser.loadPDF(l.path);
    }
}

function availableToJSON() {
    const arr: Array<{name: string, available: boolean}> = [];
    for (const l of available_lists) {
        arr.push({name: l.name, available: l.available});
    }
    return arr;
}

function parseJSON(p: any, e: Array<ExamDay>) {
	let ignoring = false; // "In folgenden Kursen fehlen deswegen Schüler:"
	let date = ""; // 2x ".", 10 chars
	let day = ""; // Montag Dienstag Mittwoch Donnerstag Freitag
	let timeframe = ""; // 2x ".", else chars

	let counter = 0;
	let exam = {
		course: "",
		teacher: "",
		people: -1,
		max_people: -1,
		length: "",
	} as Exam;
	let exam_day = {
		date: "",
		day: "",
		timeframe: "",
		exams: [],
	} as ExamDay;

	for (let text of p.Texts) {
		let t = "";
		text.R.forEach((r) => {
			t += r.T;
		})
		t = t.replaceAll("%20", " ");
		t = t.replaceAll("%3A", ":");
		t = t.replaceAll("%2F", "/");
		t = t.replaceAll("%C3%BC", "ü");

		if (t.includes("fehlen")) { // In folgenden Kursen fehlen deswegen Schüler:
			// console.log("IGNORING");
			ignoring = true;
			continue;
		}
		if (t[1] === ".") {
			// console.log(`TIMEFRAME: ${t}`);
			timeframe = t;
			// console.log("finished ignoring.")
			ignoring = false;

			if (exam_day.timeframe !== "" && exam_day.timeframe !== timeframe) {
				e.push(exam_day);
				exam_day = {
					date: "",
					day: "",
					timeframe: "",
					exams: [],
				} as ExamDay;
			}
			continue;
		}
		if (t[2] === ".") {
			// console.log(`DATE: ${t}`);
			date = t;
			if (exam_day.date !== "" && exam_day.date !== t) {
				e.push(exam_day);
				exam_day = {
					date: "",
					day: "",
					timeframe: "",
					exams: [],
				} as ExamDay;
			}
			// ignoring = false;
			continue;
		}
		if (t === "Montag" || t === "Dienstag" || t === "Mittwoch" || t === "Donnerstag" || t === "Freitag") {
			// istg if this logic ever breaks because of a typo on their part (or an exam on Saturday)
			day = t;
			continue;
		}
		if (ignoring) {
			continue;
		}

		if (t.includes("GK") || t.includes("LK")) {
			exam.course = t;
			counter = 1;
			continue;
		}
		switch (counter) {
			case 1:
				exam.teacher = t;
			counter = 2;
			continue;
			case 2:
				exam.people = Number.parseInt(t);
			counter = 3;
			continue;
			case 3:
				exam.length = t;
			counter = 4;
			continue;
			case 4:
				counter = 5;
			continue;
			case 5:
				exam.max_people = Number.parseInt(t);

			exam_day.date = date;
			exam_day.day = day;
			exam_day.timeframe = timeframe;

			counter = 0;
			exam_day.exams.push(exam);
			exam = {
				course: "",
				teacher: "",
				people: -1,
				max_people: -1,
				length: "",
			} as Exam;
		}

	}

	if (exam.course !== "") {
	exam_day.exams.push(exam);
	}

	if (exam_day.exams.length > 0) {
	    e.push(exam_day);
	}
}

export function initExamAPI(app: Express, authenthicateDSB: AuthFunction) {
    app.get('/exams/:id', authenthicateDSB, (req: Request, res: Response) => {
        const id = req.params.id;
        if (id === "index") {
            res.json(availableToJSON());
            return;
        }
        for (const l of available_lists) {
            if (l.name === id) {
                if (l.exams.length > 0) {
                    res.json(l.exams);
                } else {
                    res.sendStatus(425);
                }
                return;
            }
        }
        res.sendStatus(400);
    });
    app.options('/exams/:id', (_req: Request, res: Response) => {
        res.send();
        //res.setHeader("Content-Type", "text/calendar");
    });

    console.log("Exam API init done.");
}
//#endregion