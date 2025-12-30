import { MutableRef, useCallback, useEffect, useId, useRef, useState } from "preact/hooks";

import Line from "./line";
import Placeholder from "./placeholder";
import ImgInput from "./imginput";
import { CheckButton, Select } from "./settingshelper";

//import serializeEvent from "../util/event_helper";

import visibleIcon from "../assets/icons/visible.png";
import hiddenIcon from "../assets/icons/hidden.png";
import refreshIcon from "../assets/icons/refresh.png";
import refreshSuccessIcon from "../assets/icons/refresh_success.png";
import refreshFailIcon from "../assets/icons/refresh_fail.png";
import importantIcon from "../assets/icons/important.png";
import plink from "../assets/placeholder.gif";
// import dsbIcon from "/favicons/dsb_simplistic192.png";


//#region interfaces and enums
interface Substitution { // the thing to show in the table
  classes: string;
  hours: string;
  subject: string;
  usual_subject: string;
  room: string;
  replacement: string;
}

interface DayTimetable { // timetable data for a day
  date: string;
  day: string;
  messages: Array<string>;
  substitutions: Array<Substitution>;
}

interface Timetables { // the thing you get from the api
  last_modified: string;
  day_one: DayTimetable;
  day_two: DayTimetable;
}

interface CourseInfo { // uhhhh something important I think
  subject: string;
  subject_name: string;
  course: string;
  written?: boolean;
  color?: string;
}

interface GradeInfo { // maybe this is important too? (I don't rember)
  gradeName: string;
  gradeLetter: string;
}

interface ExamDay {
    date: string,
    day: string,
    timeframe: string,
    exams: Array<Exam>,
}

interface Exam {
    course: string, // BI-GK3
    teacher: string, // Lug
    people: number, // 10
    max_people: number, // 18
    length: string, // 2-stündig
}

const week: String[] = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] // don't question it

enum ParasitesHandler { // for settings
  NONE = "none",
  SHORTEN = "shorten",
  EXTERMINATE = "exterminate",
}
enum ExamVisibility {
  ALL = "all",
  SORTED = "sorted",
  NONE = "none",
}
enum SubstitutionType { // for new design
  MOVED,
  FREE,
  EXAM,
  SUBSTITUTION,
}

interface DSBSettings {
  easterEggs: boolean,
  parasites: ParasitesHandler,
  exams: ExamVisibility,
  oldExams: boolean,
  advancedCourses: boolean,
  showCourses: boolean,
  showCredits: boolean,
  yellowPaint: boolean,
  newDesign: boolean,
}

enum FilterStage {
  ALL = "all",
  GRADE = "grade",
  COURSES = "courses",
}
//#endregion

//#region tl dumpsterfire
async function validateCredentials(): Promise<boolean> { // returns true if credentials are valid
  const user = localStorage.getItem("user");
  const key = localStorage.getItem("key"); // get credentials from localStorage
  if (user === undefined || key === undefined || user === null || key === null) { // credentials are not saved
    return false;
  }

  try {
    const data = await fetch(
      "https://kirillathome.uucode.com/api/v1/dsbdummy",
      { // request to the dummy api
        headers: {
          "user": user,
          "key": key,
        },
      },
    );
    if (data.status === 401 || data.status === 403) {
      console.log("forbidden or unauth")
      return false;
    }
    // if (!data.ok) { // not ok
    //   // console.log("failed at point 1")
    //   return false;
    // }
    return true; // ok
  } catch {
    // console.log("failed at point 2")
    console.log("this shit not work")
    return true; // not ok (but worse)
    // HEAR ME OUT: THE USER IS PROBABLY LOGGED IN, IF IT FAILED AT THIS POINT. NOT LIKE WE CARE ABOUT SECURITY AROUND HERE ANYWAY
  }
}

// function getRandomSubtitutions(): Array<Substitution> { // old debug code
//   const length = Math.floor((Math.random() * 4 + 1) * 3);
//   const array = [];

//   for (let i = 0; i < length; i++) {
//     const s = {} as Substitution;
//     const grades = ["6abc", "8d", "7a", "10b", "5c", "EF", "Q1", "Q2"];
//     s.classes = grades[Math.floor(Math.random() * grades.length)];
//     s.hours = (Math.floor(Math.random() * 5 + 1)).toString();
//     const subjects = ["E G4", "IF L1", "CH G1", "GE G1", "D G2", "SP G3"];
//     const subject = subjects[Math.floor(Math.random() * subjects.length)];
//     s.subject = subject;
//     s.usual_subject = subject;
//     s.room = Math.random() > 0.7 ? "PS1" : "H116";
//     s.replacement = "---";

//     array[i] = s;
//   }

//   return array;  
// }

// function getRandomMessages(): Array<string> {
//   const messages = ["Heute ist keine Schule?", "Warum nutzt du das Mock API?", "Tolle Sachen hier, ne?", "Funktionieren die Benachrichtigungen?", "Vergiss nicht dein Feedback direkt in den Schredder zu tun!", "Fun Fact: Für keine dieser Nachrichten habe ich ChatGPT verwendet!", "updater={(v: boolean) => updateSetting(\"notifications\", v)}", "Experimentell. Wird unvermeindlich kaputt gehen."];

//   return [messages[Math.floor(Math.random() * messages.length)]];
// }
//#endregion

//#region scuffed react gaming
function DSBLogin(props: { // login panel
  setLoggedIn: Function,
}) {
  const userInputRef = useRef(null);
  const keyInputRef = useRef(null); // the refs
  const [showError, setShowError] = useState(false); // show error
  const [showPassword, setShowPassword] = useState(false);
  const handleSubmit = useCallback( // when the form is submitted
    (event: SubmitEvent) => {
      event.preventDefault(); // prevent default

      const user = userInputRef.current.value; // get values
      const key = keyInputRef.current.value;

      localStorage.setItem("user", user); // store values
      localStorage.setItem("key", key);

      validateCredentials().then((valid) => {
        setShowError(!valid); // error
        if (valid) { // no error
          props.setLoggedIn(true);
        }
      });
    },
    [],
  );
  const toggleShowPassword = useCallback(() => {
    setShowPassword(!showPassword);
    return false;
  }, [showPassword]);

  return (
    <div class="default-div form-div"> 
      {showError && ( // I never did fix the error div clipping. oh well
        <div class="error-div"> 
          <b>
            <p>Fehler!</p>
            <p>Überprüfe bitte deine Daten!</p>
          </b>
        </div>
      )}
      <div>

        <h1>
          Login
        </h1>
        <Line width="30px" height="3px" />
        <form id="login-form" onSubmit={handleSubmit}>
          <div>
            <label for="user">DSB Nutzername:</label>
            <input
              type="text"
              name="user"
              id="user"
              ref={userInputRef}
              required
            />
          </div>
          <div id="password-wrapper">
            <label for="key" ref={keyInputRef}>DSB Passwort:</label>
            <div class="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="key"
                id="key"
                ref={keyInputRef}
                required
              />
              <ImgInput
                onClick={toggleShowPassword}
                pixel={true}
                src={(showPassword ? visibleIcon : hiddenIcon).src}
                width="24px"
                height="24px"
                alt="show password?"
              />
            </div>
          </div>
          <div>
            <input type="submit" value="Einloggen" />
          </div>
        </form>
      </div>
    </div>
  );
}

function DSBRefreshButton(props: { // refresh button used for reloading substitutions (& exams sometimes)
  getData: Function,
  success: boolean,
  setSuccess: Function,
}) {
  // const [success, setSuccess] = useState(undefined);
  const handleClick = useCallback(async () => {
    props.setSuccess(null);
    const status = await props.getData();
    props.setSuccess(status);
  }, [props]);
  const getIcon = useCallback(() => {
    switch (props.success) {
      case true:
        return refreshSuccessIcon;
      case false:
        return refreshFailIcon;
      default:
        return refreshIcon;
    }
  }, [props.success]);

  return (
    <ImgInput
      onClick={handleClick}
      src={getIcon().src}
      pixel={true}
      width="24px"
      height="24px"
      alt="refresh"
    />
  );
}

function DSBTableToolbar(props: { // toolbar for switching day & filtering options
  setFilterStage: Function,
  changeCurrentDay: Function,
  getData: Function,
  timetable: Timetables,
  currentDay: DayTimetable,
  success: boolean,
  setSuccess: Function,
}) {
  const filterStageRef = useRef(null);
  const handleFilterChange = useCallback(() => {
    const filterStage = (filterStageRef.current as HTMLSelectElement).value;
    localStorage.setItem("filterStage", filterStage);
    props.setFilterStage(filterStage);
  }, [props]);

  const setDayOne = useCallback(() => {
    props.changeCurrentDay("day_one");
  }, [props]);
  const setDayTwo = useCallback(() => {
    props.changeCurrentDay("day_two");
  }, [props]);

  useEffect(() => {
    const filterStage = localStorage.getItem("filterStage");
    if (filterStage !== null && filterStage !== undefined) {
      (filterStageRef.current as HTMLSelectElement).value = filterStage;
      props.setFilterStage(filterStage);
    }
  }, []);

  return (
    <div id="toolbar">
      <div>
        <DSBRefreshButton getData={props.getData} success={props.success} setSuccess={props.setSuccess} />
        <select ref={filterStageRef} onChange={handleFilterChange}>
          <option value={FilterStage.ALL}>Alle anzeigen</option>
          <option value={FilterStage.GRADE}>Nur deine Stufe/Klasse</option>
          <option value={FilterStage.COURSES}>Nur deine Kurse/Fächer</option>
        </select>
      </div>
      <div>
        {props.timetable !== null && (
          <div>
            <input
              type="button"
              onClick={setDayOne}
              value={props.timetable.day_one.day}
              class={props.currentDay.day === props.timetable.day_one.day
                ? "selected"
                : ""}
            />
            <input
              type="button"
              onClick={setDayTwo}
              value={props.timetable.day_two.day}
              class={props.currentDay.day === props.timetable.day_two.day
                ? "selected"
                : ""}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DSBSubstitution(props: Substitution) { // old design substitution
  return (
    <tr>
      <th>{props.classes}</th>
      <th>{props.hours}</th>
      {/* <th>{props.usual_subject !== "&nbsp;" ? props.usual_subject : "\u21B3"}</th> */}
      <th>{props.usual_subject !== "&nbsp;" ? props.usual_subject : "---"}</th>
      <th>
        {props.room === "PS1" || props.room === "---"
          ? <i>entfällt</i> // colors?
          : props.subject}
      </th>
      <th>
        {props.room === "PS1" || props.room === "---" ? <i>---</i> : props.room}
      </th>
    </tr>
  );
}

function DSBNewSubstitution(props: Substitution) { // new design substitution
  const getType = useCallback((): SubstitutionType => {
    if (props.room === "PS1" || props.room === "---") {
      return SubstitutionType.FREE;
    }
    if (props.usual_subject === "&nbsp;") {
      return SubstitutionType.EXAM;
    }
    if (props.usual_subject === props.subject) {
      return SubstitutionType.MOVED;
    }
    return SubstitutionType.SUBSTITUTION;
  }, [props]);

  return (
    // <div class="new-s" style={`rotate: ${(Math.random() - 0.5) * 15}deg`}> // for that one screenshot
    <div class="new-s">
      {getType() === SubstitutionType.FREE ? // Ausfall
        <div>
          <div class="s-free">
            <p><b>Ausfall</b></p>
          </div>
          <h2>{props.classes} - {props.usual_subject}</h2>
          <div class="s-grid">
            {/* <p><b>{props.hours}.</b> Stunde</p> */}
            <label><i>Stunde(n):</i></label>
            <label><b>{props.hours}</b></label>
          </div> 
        </div> : getType() === SubstitutionType.EXAM ? // Klausur
        <div>
          <div class="s-exam">
            <p><b>Klausur</b></p>
            <p><i><b>{props.room}</b></i></p>
          </div>
          <h2>{props.classes} - {props.subject !== "&nbsp;" ? props.subject : "????"}</h2>
          <div class="s-grid">
            {/* <p><b>{props.hours}.</b> Stunde</p> */}
            <label><i>Stunde(n):</i></label>
            <label><b>{props.hours}</b></label>
          </div> 
        </div> : getType() === SubstitutionType.MOVED ? // Raumverschiebung
        <div>
          <div class="s-moved">
            <p><b>Raumwechsel</b></p>
            <p><i><b>{props.room}</b></i></p>
          </div>
          <h2>{props.classes} - {props.usual_subject}</h2>
          <div class="s-grid">
            {/* <p><b>{props.hours}.</b> Stunde</p> */}
            <label><i>Stunde(n):</i></label>
            <label><b>{props.hours}</b></label>
          </div> 
        </div> :  // Vertretung
        <div>
          <div class="s-subst">
            <p><b>Vertretung</b></p>
            <p><i><b>{props.room}</b></i></p>
          </div>
          <h2>{props.classes} - <del>{props.usual_subject}</del></h2>
          <div class="s-grid">
            {/* <p><b>{props.hours}.</b> Stunde</p> */}
            <label><i>Stunde(n):</i></label>
            <label><b>{props.hours}</b></label>
            <label><i>Fach:</i></label>
            <label><b>{props.subject}</b></label>
          </div> 
          <div class="s-darker s-grid">
            {props.replacement !== "---" && (
              <label><i>Statt:</i></label>
            )}
            {props.replacement !== "---" && (
              <label><b>{props.replacement}</b></label>
            )}
          </div>
        </div>}
      </div>
  );
}

function DSBTable(props: { // the main feature of this website
  grade: GradeInfo,
  courses: Array<CourseInfo>,
  settings: DSBSettings,
}) {
  const [timetable, setTimetable] = useState(null as Timetables);
  const [currentDay, setCurrentDay] = useState(null as DayTimetable);
  const [filterStage, setFilterStage] = useState(FilterStage.ALL);
  const [success, setSuccess] = useState(null);

  const getData = useCallback(async (): Promise<boolean> => {
    // if (!!props.settings.mockAPI) { // old debug code
    //   console.log("Using the mock API!");
    //   const data = {} as Timetables;

    //   data.day_one = {} as DayTimetable;
    //   data.day_two = {} as DayTimetable;

    //   data.last_modified = "13.04.2027 02:54";
    //   data.day_one.date = "13.4.2027";
    //   data.day_one.day = "Samstag";
    //   data.day_one.messages = getRandomMessages();
    //   data.day_one.substitutions = getRandomSubtitutions();

    //   data.day_two.date = "14.4.2027";
    //   data.day_two.day = "Sonntag";
    //   data.day_two.messages = getRandomMessages();
    //   data.day_two.substitutions = getRandomSubtitutions();

    //   if (!!currentDay) {
    //     if (currentDay.day === data.day_two.day) {
    //       setCurrentDay(data.day_two);
    //     } else {
    //       setCurrentDay(data.day_one);
    //     }
    //   } else {
    //     setCurrentDay(data.day_one);
    //   }
    //   setTimetable(data);

    //   notifyTimetablesToSW();

    //   return true;
    // }


    const user = localStorage.getItem("user");
    const key = localStorage.getItem("key"); // get credentials from localStorage

    try {
      const data = await fetch("https://kirillathome.uucode.com/api/v1/dsb", { // request to the real api
        headers: {
          "user": user,
          "key": key,
        },
      });
      if (!data.ok) { // not ok
        return false;
      }

      const json = await data.json(); // yippie we got the data without errors!
      if (!!currentDay) {
        if (currentDay.day === json.day_two.day) {
          setCurrentDay(json.day_two);
        } else {
          setCurrentDay(json.day_one);
        }
      } else {
        setCurrentDay(json.day_one);
      }
      setTimetable(json);
      return true; // ok
    } catch {

      return false; // not ok (but worse)
      // actually you don't have internet just but ok
    }
  }, [setTimetable, currentDay, props.settings]);

  const changeCurrentDay = useCallback((day: string) => {
    if (day === "day_one") {
      setCurrentDay(timetable.day_one);
      return;
    }
    if (day === "day_two") {
      setCurrentDay(timetable.day_two);
    }
  }, [setCurrentDay, timetable]);

  const getFilteredSubstitutions = useCallback((): Array<Substitution> => {
    if (currentDay === null) {
      return [];
    }
    return currentDay.substitutions.filter((s) => {
      switch (filterStage) {
        case FilterStage.ALL:
          return true;
        case FilterStage.GRADE:
          if (!s.classes.includes(props.grade.gradeName)) {
            return false;
          }
          if (props.grade.gradeLetter !== "") {
            if (!s.classes.includes(props.grade.gradeLetter)) { // sloppy code, should be improved
              return false;
            }
          }
          return true;
        case FilterStage.COURSES:
          if (!s.classes.includes(props.grade.gradeName)) {
            return false;
          }
          // console.log(`usual subject: ${s.usual_subject}`)
          for (const c of props.courses) {
            const name = c.course !== "" ? c.subject + " " + c.course[0] + c.course[2] : c.subject;
            let usual_subject = s.usual_subject;
            if (usual_subject[1] === " ") {
              usual_subject = usual_subject[0] + usual_subject.substring(2);
            }

            let subject = s.subject;
            if (subject[1] === " ") {
              subject = subject[0] + subject.substring(2);
            }
            // console.log(`subject_name: ${c.subject_name}, real_name: ${name}, edited name: ${usual_subject}`);
            if (usual_subject === name || subject === name) {
              // console.log("RETURNING TRUE");
              return true;
            }
          }
          return false;
      }
    });
  }, [currentDay, filterStage, props.grade, props.courses]);

  const getDataAndUpdate = useCallback(async () => {
    const status = await getData();
    if (!!!status) {
      setSuccess(false);
    }
  }, [setSuccess]);

  useEffect(() => { // load timetables on page load
    getDataAndUpdate();
  }, []);

  return (
    <div class="default-div">
      <DSBTableToolbar
        getData={getData}
        setFilterStage={setFilterStage}
        timetable={timetable}
        currentDay={currentDay}
        changeCurrentDay={changeCurrentDay}
        success={success}
        setSuccess={setSuccess}
      />
      {currentDay === null && success !== false && (
        <div>
          <h2>Lade, bitte warten...</h2>
        </div>
      )}
      {currentDay === null && success === false && (
        <div>
          <p><i>aktuell nicht verfügbar.</i></p>
        </div>
      )}
      {currentDay !== null && (
        <div>
          <h2>
            Vertretungen für {currentDay.day}, den {currentDay.date}
          </h2>
          <Line width="50px" height="3px" />
          <h3>
            (Stand: {timetable.last_modified})
          </h3>

          {getFilteredSubstitutions().length == 0 && (
            <div>
              <p>
                <i>nichts...</i>
              </p>
              {Math.random() > 0.975 && props.settings.easterEggs && ( // yeah this is the line for the easter egg if you want to add your own
                <div>

                  <Placeholder height="17.6px" />
                  {/* <div class="center"> */}
                  <Line width="80px" height="3px" />
                    {/* <p>herzlichen glückwunsch, du hast das 1 in 40 easter egg bekommen.</p> */}
                    {/* <p><span class="pixelify">wenn man lange genug in das </span><i>nichts...</i><span class="pixelify"> starrt, starrt das </span><i>nichts...</i><span class="pixelify"> irgendwann zurück.</span></p> */}
                    {/* <Placeholder height="16px" /> */}
                    <div class="center">
                      <img src={plink.src} alt="plinK" width="280px" />
                    </div>
                  {/* </div> */}
                </div>
              )}
            </div>
          )}

          {getFilteredSubstitutions().length > 0 && props.settings.newDesign === false && (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Klasse/Stufe</th>
                    <th>Stunde(n)</th>
                    <th>Kurs</th>
                    <th>Ersatz</th>
                    <th>Raum</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredSubstitutions().map((s) => {
                    if (s.usual_subject.includes("AG")) {
                      switch (props.settings.parasites) {
                        case ParasitesHandler.NONE:
                          break;
                        case ParasitesHandler.SHORTEN:
                          return (
                            <DSBSubstitution
                              classes="*"
                              hours={s.hours}
                              subject={s.subject}
                              room={s.room}
                              usual_subject={s.usual_subject}
                              replacement={s.replacement}
                            />
                          );
                        case ParasitesHandler.EXTERMINATE:
                          return null; // what parasite?
                      }
                    }
                    return (
                      <DSBSubstitution
                        classes={s.classes}
                        hours={s.hours}
                        subject={s.subject}
                        room={s.room}
                        usual_subject={s.usual_subject}
                        replacement={s.replacement}
                      />
                    );
                  })}
                </tbody>
              </table>
              <Placeholder height="50px" />
            </div>

          )}

          {getFilteredSubstitutions().length > 0 && props.settings.newDesign === true && (
            <div>
              <Placeholder height="20px" />
              <div id="new-slist">
                {/* <h1>NEUES DESIGN</h1> */}
                {getFilteredSubstitutions().map((s) => {
                    if (s.usual_subject.includes("AG")) {
                      switch (props.settings.parasites) {
                        case ParasitesHandler.NONE:
                          break;
                        case ParasitesHandler.SHORTEN:
                          return (
                            <DSBNewSubstitution
                              classes="*"
                              hours={s.hours}
                              subject={s.subject}
                              room={s.room}
                              usual_subject={s.usual_subject}
                              replacement={s.replacement}
                            />
                          );
                        case ParasitesHandler.EXTERMINATE:
                          return null; // what parasite?
                      }
                    }
                    return (
                      <DSBNewSubstitution
                        classes={s.classes}
                        hours={s.hours}
                        subject={s.subject}
                        room={s.room}
                        usual_subject={s.usual_subject}
                        replacement={s.replacement}
                      />
                    );
                  })}
              </div>
              <Placeholder height="20px" />
            </div>
          )}


          

          {!(currentDay.messages[0] === "" || currentDay.messages.length < 1) && <div>
            <h2>
              Nachrichten für {currentDay.day}, den {currentDay.date}
            </h2>
            <Line width="50px" height="3px" />
            <h3>
              (Stand: {timetable.last_modified})
            </h3>
            <ol>
              {currentDay.messages[0] === "" && <li>Nichts!</li>}
              {currentDay.messages.map((m) => {
                if (m === "") {
                  return null;
                }
                return <li>{m}</li>;
              })}
            </ol>
          </div>}
        </div>
      )}
    </div>
  );
}

function Course(props: { // the courses that you can add
  subject: string,
  subject_name: string,
  course: string,
  index: number,
  written?: boolean,
  color?: string,

  advanced: boolean,

  courses: CourseInfo[],
  setCourses: Function,
}) {
  const subjectSelectID = useId();
  const courseSelectID = useId();
  const writtenSelectID = useId();
  const colorSelectID = useId();

  const writtenRef = useRef();
  const colorRef = useRef();

  const handleButtonClick = useCallback(() => {
    const courses = props.courses.filter((_c, i) => { // inefficient implementation but fuck javascript ig
      return i !== props.index;
    });

    localStorage.setItem('courses', JSON.stringify(courses));
    props.setCourses(courses);
  }, [props]);

  const handleWrittenClick = useCallback(() => {
    if (!!writtenRef) {
      const courses = props.courses.filter(() => {return true;});
      // console.log(`updating from ${courses[props.index].written}`);
      courses[props.index].written = (writtenRef.current as HTMLInputElement).checked;
      // console.log(`to ${courses[props.index].written}`);

      localStorage.setItem('courses', JSON.stringify(courses));
      props.setCourses(courses);
    }

    
  }, [props, writtenRef])
  const handleColorChange = useCallback(() => {
    if (!!colorRef) {
      const courses = props.courses.filter(() => {return true;});
      courses[props.index].color = (colorRef.current as HTMLInputElement).value;

      localStorage.setItem('courses', JSON.stringify(courses));
      props.setCourses(courses);
    }
  }, [props, colorRef])

  return (
    <div class='course'>
      <div>
        {/* <Placeholder width="24px" /> */}
        <div></div>
        <h3>
          {!!props.subject ? props.subject + (!!props.course && props.course !== "" ? "-" + props.course : "") : "D:"}
        </h3>

        {!!props.written ? (<img src={importantIcon.src} class="pixel" height="24px" width="24px" loading="lazy" alt="schriftlich" title="Schriftliches Fach" />) : (<div></div>)}
      </div>
      <div>
        <label for={subjectSelectID}>Fach:</label>
        <span id={subjectSelectID}>{!!props.subject_name ? props.subject_name : ":'("}</span>

        <label for={courseSelectID}>Kurs:</label>
        <span id={courseSelectID}>{!!props.course ? props.course : "---"}</span>

        {props.advanced && (<label for={writtenSelectID}>Schriftlich:</label>)}
        {props.advanced && (<div class="flex"><input id={writtenSelectID} name={writtenSelectID} type="checkbox" checked={!!props.written} ref={writtenRef} onClick={handleWrittenClick} /></div>)}

        {props.advanced && (<label for={colorSelectID}>Farbe:</label>)}
        {props.advanced && (<div class="flex"><input id={colorSelectID} name={colorSelectID} list="course-color-list" type="color" value={!!props.color ? props.color : "#0958C6"} ref={colorRef} onChange={handleColorChange} /></div>)}

        <Placeholder height='26px' />
        <input type='button' value='Entfernen' onClick={handleButtonClick} />
      </div>

    </div>
  );
}

function CourseAdder(props: { // thing for adding courses (yes it's seperate I'm not stupid)
  courses: CourseInfo[],
  setCourses: Function,
  subjectSelectRef: MutableRef<HTMLSelectElement>,
}) {
  
  const courseSelectRef = useRef(null);

  const handleSubmit = useCallback((event: SubmitEvent) => {
    event.preventDefault();
    
    const subject = (props.subjectSelectRef.current as HTMLSelectElement).value;
    let subject_name = subject;

    for (const opt of Array.from((props.subjectSelectRef.current as HTMLSelectElement).options)) { // I may have borked something but I won't check =)
      if (opt.value === subject) {

        subject_name = opt.text;
        break;
      }
    }
    const course = (courseSelectRef.current as HTMLSelectElement).value;

    const courses = props.courses.concat({
      subject: subject,
      subject_name: subject_name,
      course: course,
      written: true
    })
    
    localStorage.setItem('courses', JSON.stringify(courses));
    props.setCourses(courses);
  }, [props, props.subjectSelectRef, courseSelectRef]);

  return ( // yes I put all subjects in by hand
    <div class='course'>
        <h3>
          Neuer Kurs
        </h3>
      <form id='course-adder' onSubmit={handleSubmit}>
        <label for='subject-name'>Fach:</label>
        <select id='subject-name' ref={props.subjectSelectRef} required>
          <option value=''>Wähle ein Fach:</option>
          <hr />
          <optgroup label='MINT'>
            <option value='BI'>Biologie</option>
            <option value='CH'>Chemie</option>
            <option value='IF'>Informatik</option>
            <option value='M'>Mathe</option>
            <option value='PH'>Physik</option>
            <option value='PXM'>Pjk. Mathe</option>
          </optgroup>
          <optgroup label='Sprachen'>
            <option value='D'>Deutsch</option>
            <option value='E'>Englisch</option>
            <option value='L'>Latein</option>
            <option value='F'>Französisch</option>
            <option value='S0'>Spanisch (S0)</option>
            <option value='S9'>Spanisch (S9)</option>
          </optgroup>
          <optgroup label='Gesellschaftswissenschaften'>
            <option value='EK'>Erdkunde</option>
            <option value='GE'>Geschichte</option>
            <option value='PL'>Philosophie</option>
            <option value='ER'>Religion (Ev.)</option>
            <option value='KR'>Religion (Kath.)</option>
            <option value='SW'>Sozialwissenschaften</option>
          </optgroup>
          <optgroup label='der Rest'>
            <option value='IP'>IP</option>
            <option value='KU'>Kunst</option>
            <option value='LI'>Literatur</option>
            <option value='MU'>Musik</option>
            <option value='SP'>Sport</option>
          </optgroup>
        </select>

        <label for='course-id'>Kurs:</label>
        <select id='course-id' ref={courseSelectRef}>
          <option value='' selected>---</option>
          <option value='GK1'>GK1</option>
          <option value='GK2'>GK2</option>
          <option value='GK3'>GK3</option>
          <option value='GK4'>GK4</option>
          <option value='GK5'>GK5</option>
          <option value='LK1'>LK1</option>
          <option value='LK2'>LK2</option>
          <option value='LK3'>LK3</option>
          {/* <option value='LK4'>LK4</option> */}
          {/* <option value='PJK1'>PJK1</option> */}
        </select>

        <Placeholder height='26px' />
        <input type='submit' value='Hinzufügen' />
      </form>
      
    </div>
  );
}

function CourseList(props: { // thing for displaying your courses & the course adder
  grade: GradeInfo,
  setGrade: Function,
  courses: Array<CourseInfo>,
  setCourses: Function,
  subjectSelectRef: MutableRef<HTMLSelectElement>,
  settings: DSBSettings,
}) {
  const gradeNameRef = useRef(null);
  const gradeLetterRef = useRef(null);

  const [loadedData, setLoadedData] = useState(false);

  const updateGradeName = useCallback(() => {
    const gradeName = (gradeNameRef.current as HTMLInputElement).value;
    const newGrade: GradeInfo = {gradeName: gradeName, gradeLetter: props.grade.gradeLetter};
    localStorage.setItem('grade', JSON.stringify(newGrade));
    props.setGrade(newGrade);

  }, [props]);

  const updateGradeLetter = useCallback(() => {
    const gradeLetter = (gradeLetterRef.current as HTMLSelectElement).value;
    const newGrade: GradeInfo = {gradeName: props.grade.gradeName, gradeLetter: gradeLetter};
    localStorage.setItem('grade', JSON.stringify(newGrade));
    props.setGrade(newGrade);

  }, [props]);

  useEffect(() => {
    if (!loadedData) {
      const savedCourses: Array<any> = JSON.parse(localStorage.getItem('courses'));
      if (!!savedCourses && savedCourses.length > 0 && savedCourses[0].courseName !== undefined && savedCourses[0].courseSubject !== undefined && savedCourses[0].courseType !== undefined) {
        console.log("DOING LEGACY COURSE LOADING! (please be careful)"); // this is ancient and probably unnecessary but I am too scared to remove it
        props.setCourses(savedCourses.map((c: {courseName: string, courseSubject: string, courseType: string}): CourseInfo => {
          let sname = c.courseName;
          if (sname[sname.length - 2] === "K") {
            sname = sname.substring(0, sname.length - 4);
          }
          return {subject_name: sname, subject: c.courseSubject, course: c.courseType} as CourseInfo;
        }));
        }
      if (!!savedCourses && savedCourses.length > 0 && savedCourses[0].subject !== undefined && savedCourses[0].subject_name !== undefined && savedCourses[0].course !== undefined) {
        for (const c of savedCourses) {
          let sname = c.subject_name;
          if (sname[sname.length - 2] === "K") {
            sname = sname.substring(0, sname.length - 4); // don't remember what this does but probably also related to migrating old data
            c.subject_name = sname;
        }
      }

      if (!!savedCourses && savedCourses.length > 0 && (savedCourses[0].written === undefined || savedCourses[0].written === null)) {
        console.log("migrating to written courses system"); // yeah this is somewhat new but probably not really needed anymore

        for (const c of savedCourses) {
          if (c.written === undefined || c.written === null) {
            c.written = true;
          }
        }

        localStorage.setItem('courses', JSON.stringify(savedCourses));
      }
      props.setCourses(savedCourses);
      
      }

      const savedGrade: GradeInfo = JSON.parse(localStorage.getItem('grade'));
      if (!!savedGrade) {
        // (gradeNameRef.current as HTMLInputElement).value = savedGrade.gradeName;
        // (gradeLetterRef.current as HTMLSelectElement).value = savedGrade.gradeLetter;
        props.setGrade(savedGrade);
      }

      setLoadedData(true);
    }
  }, []);

  return props.settings.showCourses && (
    <div class="default-div" id="course-selection">
      <h2>
        Kurswahl
      </h2>
      <Line width="30px" height="3px" />
      {!!props.settings.yellowPaint && (
        <div>
          <p>
            Wähle deine Stufe/Klasse und die für dich relevanten Kurse/Fächer aus.
          </p>
          <p>
            {/* Die Ergebnisse werden dann oben gefiltert angezeigt. */}
            Diese werden dann im Vertretungs- & Klausurplan sortiert angezeigt.
          </p>
          <p><b>Tipp</b>: die Schriftlichkeit und die Farbe eines Kurses kannst du ändern, indem du <b class="code">Fortgeschrittene Kurse</b> anschaltest.</p>
          <Placeholder height="30px" />
        </div>
      )}
      <div id='course-list-wrapper'>
        <div id='grade-selector'>
          <h3>Stufe/Klasse</h3>
          {/* <Line width='45px' height='3px' /> */}
          <div id='grade-input'>
            <input value={props.grade.gradeName} type='text' list='grade-list' ref={gradeNameRef} onChange={updateGradeName} aria-controls={'grade-input'} aria-expanded />
            <datalist id='grade-list'>
              <option value='5'>5</option>
              <option value='6'>6</option>
              <option value='7'>7</option>
              <option value='8'>8</option>
              <option value='9'>9</option>
              <option value='10'>10</option>
              <option value='EF'>EF</option>
              <option value='Q1'>Q1</option>
              <option value='Q2'>Q2</option>
            </datalist>
            <select value={props.grade.gradeLetter} ref={gradeLetterRef} onChange={updateGradeLetter}>
              <option value=''>---</option>
              <option value='a'>a</option>
              <option value='b'>b</option>
              <option value='c'>c</option>
              <option value='d'>d</option>
              <option value='e'>e</option>
            </select>
            <datalist id='course-color-list'>
              <option value="#0958C6" />
              <option value="#842593" />
              {/* <option value="#ffff00" /> // if you know you know (pattern recognition)
              <option value="#ff00ff" /> */}
            </datalist>
          </div>
        </div>
        <div id='course-list'>
          {loadedData && props.courses.map((c, i) => {
            return ( // style guidelines hate this one simple trick: (hope you know how to scroll horizontally)
              <Course subject={c.subject} subject_name={c.subject_name} course={c.course} courses={props.courses} setCourses={props.setCourses} index={i} written={c.written} color={c.color} advanced={props.settings.advancedCourses} />
            );
          })}
          <CourseAdder courses={props.courses} setCourses={props.setCourses} subjectSelectRef={props.subjectSelectRef} />
        </div>
      </div>
    </div>
  );
}

function ExamDayDisplay(props: { // displays a single (sorted) day of exams
  examDays: Array<ExamDay>, // array because fuck you
  subjectSelectRef: MutableRef<HTMLSelectElement>,
  settings: DSBSettings,
  courses: Array<CourseInfo>,
  list: string,
}) {
  // const serialize = useCallback((d: ExamDay, e: Exam): string => {
  //   // console.log(JSON.stringify(d));
  //   // console.log(JSON.stringify(d))
  //   return ;
  // }, []);

  const prettifyCourse = useCallback((course: string): [string, string] => {
    let split = course.split("-");

    let n = "";
    for (const c of props.courses) { // getting name from json (may fail)
      if (c.subject === split[0]) {
        n = c.subject_name;
        if (c.course === "" || c.course === split[1]) {
          return [n, split[1]]
        }
      }
    }
    if (n !== "") {
      return [n, split[1]];
    }

    if (!!props.subjectSelectRef.current) { // fallback 1 (fails if courselist is hidden)
      for (let o of Array.from(props.subjectSelectRef.current.options)) {
        if (o.value === split[0]) {
          return [o.text, split[1]];
        }
      }
    }

    return [course, ""]; // fallback 2
  }, [props.subjectSelectRef.current, props.courses]);

  const shouldDisplay = useCallback((examDay: ExamDay, settings: DSBSettings, courses: Array<CourseInfo>): boolean => {
    if (settings.exams === ExamVisibility.ALL) {
      return true;
    }

    const l = examDay.exams.filter(e => { // yeah this is the funni I think
      return courses.filter(c => {
        return !!c.written && (c.course === "" ? c.subject === e.course.split("-")[0] : c.subject === e.course.split("-")[0] && c.course === e.course.split("-")[1]);
      }).length > 0;
    }).length;
    
    return l > 0;
  }, [])

  return (
    <div>
      <h2>{props.examDays[0].day}, der {props.examDays[0].date}</h2>

      {props.examDays.map((d) => {
        return shouldDisplay(d, props.settings, props.courses) && (
          <div>
            <h3>{d.timeframe}</h3>
            <div class="settings-div">
              {d.exams.map((e) => {
                const l = props.courses.filter(c => {
                  return !!c.written && (c.course === "" ? c.subject === e.course.split("-")[0] : c.subject === e.course.split("-")[0] && c.course === e.course.split("-")[1]);
                });

                return (l.length > 0 || props.settings.exams === ExamVisibility.ALL) && (<div class="exam">
                  <div>
                    <h3>{prettifyCourse(e.course)[0]} {prettifyCourse(e.course)[1]}</h3>
                    <p><i>Lehrer:</i> {e.teacher}</p>
                    <p><i>Es schreiben:</i> {e.people}/{e.max_people}</p>
                    <p><i>Dauer:</i> {e.length}</p>
                  </div>
                  
                  {/* this is the line responsible for the CSS injection, it's obscure enough not to patch it */}
                  <a class="fakebutton" style={`background-color: ${!!l[0] && !!l[0].color ? l[0].color : '#0958C6'}`} href={`https://kirillathome.uucode.com/api/v1/ical/${props.list}/${e.course}.ics`}>zum Kalender hinzufügen</a>
                  {/* <input type="button" value="zum Kalender hinzufügen" onClick={() => serialize(d, e)} style={`background-color: ${!!l[0] && !!l[0].color ? l[0].color : '#0958C6'}`} /> */}
                </div>);
              })}
            </div>
          </div>
        )
      })}
      {/* <h3>{props.examDays[0].timeframe}</h3>
      <ul>  
        {props.exams.map((e) => {
          return (<li>
            <p>{e.course}, {e.length}, {e.max_people}/{e.people}, {e.teacher}</p>
          </li>);
        })}
      </ul> */}
    </div>
  );
}

function ExamList(props: { // sorted list of all of your exams (probably the most complicated part of this website)
  subjectSelectRef: MutableRef<HTMLSelectElement>,
  settings: DSBSettings,
  courses: Array<CourseInfo>,
  grade: GradeInfo,
}) {
  const [examList, setExamList] = useState(undefined as Array<Array<ExamDay>>);
  const [availableLists, setAvailableLists] = useState(undefined as Array<{name: string, available: boolean}>);
  const [date, setDate] = useState(undefined as Date);
  const [list, setList] = useState(""); // RELEASE THE DSBSCRAPER LIST

  const [reloadSuccess, setReloadSuccess] = useState(undefined);

  const examListSelectRef = useRef();

  // fuck you geeksforgeeks

  const stringToDate = useCallback((str: string): Date => { // e.g. "02.10.2025" to something usable (AND NOT THE AMERICAN FU[NN]ING DATE FORMAT)
    const s = str.split(".");
    return new Date(`${s[2]}-${s[1]}-${s[0]}T16:00:00`);
  }, [])

  const getData = useCallback(async (): Promise<boolean> => {
    const user = localStorage.getItem("user");
    const key = localStorage.getItem("key"); // get credentials from localStorage

    try {
      const data = await fetch("https://kirillathome.uucode.com/api/v1/exams/index", { // request to the real api
        headers: {
          "user": user,
          "key": key,
        },
      });
      if (!data.ok) { // not ok
        setExamList(null);
        setAvailableLists(null);
        setReloadSuccess(false);
        return false;
      }

      // prettifyExamList(await data.json());
      // setExamList([]);
      setAvailableLists(await data.json());
      // ... why is there no return true;? I don't know either actually
    } catch {
        setExamList(null);
        setAvailableLists(null);
        setReloadSuccess(false);
        return false;
    }
  }, [setAvailableLists]);

  const initListData = useCallback(async (l: string): Promise<boolean> => {
    const user = localStorage.getItem("user");
    const key = localStorage.getItem("key"); // get credentials from localStorage

    if (l === "") {
      setExamList([]);
      return;
    }

    try {
      const data = await fetch("https://kirillathome.uucode.com/api/v1/exams/" + l, { // request to the real api
        headers: {
          "user": user,
          "key": key,
        },
      });
      if (!data.ok) { // not ok
        setExamList(null);
        return false;
      }

      // prettifyExamList(await data.json());
      prettifyExamList(await data.json());
      return true;
      // setAvailableLists(await data.json());
    } catch {
        setExamList(null);
        // setAvailableLists(null);
        return false;
    }
  }, [setExamList]);

  useEffect(() => {
    if (import.meta.env.DEV) { // this code only runs in the debug env (so if you're reading this), you can override the current date for testing
      // setDate(stringToDate("13.04.1987"));
      setDate(new Date());


      //const test = { summary: "Test Klausur LK1", description: "Es schreiben: 0/0", start: "st1", end: "en2" } as EventData
      //console.log(serializeEvent(test));
    } else {
      setDate(new Date());
    }
    // setDate(stringToDate("10.10.2025"));
    getData();
    const l = localStorage.getItem("examList");
    if (!!l) {
      setList(l);
      // updateExamList();
    }
    // console.log(l);
    initListData(!!l ? l : "")
  }, []);

  const prettifyExamList = useCallback((list: Array<ExamDay>) => {
    let new_list: Array<Array<ExamDay>> = []; // mmmmh double arrays
    let temp: Array<ExamDay> = [];
    
    for (let l of list) {
      if (temp.length <= 0) {
        temp.push(l);
        continue;
      }
      if (l.date === temp[0].date) {
        temp.push(l);
        continue;
      }

      new_list.push(temp);
      temp = [];
      temp.push(l);
    }
    if (temp.length > 0) {
      new_list.push(temp);
      temp = [];
    }

    setExamList(new_list);
    // console.log(new_list)
  }, []);
  const shouldDisplayDay = useCallback((examDays: Array<ExamDay>, settings: DSBSettings, courses: Array<CourseInfo>, date: Date): boolean => {
    if (settings.exams === ExamVisibility.ALL) {
      return true;
    }

    const l = examDays.filter((ed => { // DO NOT touch the filtering logic, if it works it works (there is a reason it is this complicated I promise)
      return ed.exams.filter(e => {
        return courses.filter(c => {
          return !!c.written && (c.course === "" ? c.subject === e.course.split("-")[0] : c.subject === e.course.split("-")[0] && c.course === e.course.split("-")[1]);
        }).length > 0;
      }).length > 0 && (settings.oldExams ? true : date.valueOf() <= stringToDate(ed.date).valueOf());
    })).length;
    return l > 0;
  }, []);
  const canDisplay = useCallback((): boolean => {
    return examList.filter((e) => {return shouldDisplayDay(e, props.settings, props.courses, date)}).length > 0;
  }, [examList, props, date]);

  const updateExamList = useCallback(async (): Promise<boolean> => {
    const user = localStorage.getItem("user");
    const key = localStorage.getItem("key"); // get credentials from localStorage
    let nlist = "";
    if (!!examListSelectRef.current) {
      nlist = (examListSelectRef.current as HTMLSelectElement).value;
    } else {
      const l = localStorage.getItem("examList");
      if (!!l) {
        nlist = l;
      }
    }
    setList(nlist);
    localStorage.setItem("examList", nlist);

    if (nlist === "") {
      console.log("skipping...");
      setExamList([]);
      return true;
    }

    try {
      const data = await fetch("https://kirillathome.uucode.com/api/v1/exams/" + nlist, { // request to the real api
        headers: {
          "user": user,
          "key": key,
        },
      });
      if (!data.ok) { // not ok
        setExamList(null);
        return false;
      }

      prettifyExamList(await data.json());
      return true;
    } catch {
        setExamList(null);
        return false;
    }
  }, [setExamList, examListSelectRef, prettifyExamList]);

  const reloadExamList = useCallback(async (): Promise<boolean> => {
    const d = await getData();
    if (d === false) {
      if (reloadSuccess === true) {
        setReloadSuccess(undefined);
      }
      return false;
    }
    const u = await updateExamList();
    if (u === false && reloadSuccess === true) {
      setReloadSuccess(undefined);
    }
    return u;
  }, [getData, updateExamList]);

  // console.log(props.settings)

  return props.settings.exams !== ExamVisibility.NONE && (
    <div class="default-div">
      {(availableLists === undefined || examList === undefined) && (  // this logic is slightly broken I think but who cares
        <h2>Lade, bitte warten...</h2>
      )}
      {availableLists !== undefined && (
        <div>
          <h2>Klausuren</h2>
          <Line width="50px" height="3px" />
          {(availableLists === null || examList === null) && ( 
            <div class="h-div">
              <DSBRefreshButton success={reloadSuccess} setSuccess={setReloadSuccess} getData={reloadExamList} /> {/* I bet you didn't know I put a refresh button here did you? */}
              <p><i>aktuell nicht verfügbar.</i></p>
            </div>
          )}
          {!!availableLists && !!examList && (
            <div>
              {/* <p>WIP, schaut bitte noch auf den offiziellen Klausurplan, wenn ihr nicht gamblen wollt.</p> */}
              {/* <p>WIP, schaut bitte noch auf den offiziellen Klausurplan, das Ding funktioniert aktuell nur so halb.</p> */}
              <p>Heute ist <b>{week[date.getDay()]}</b>, der <b>{date.getDate() < 10 ? 0 : null}{date.getDate()}.{date.getMonth() + 1 < 10 ? 0 : null}{date.getMonth() + 1}.{date.getFullYear()}</b>.</p>
              {/* {getWeek() & 1 ? (<p><b>Ungerade</b> Woche! <b>({getWeek()})</b></p>) : <p><b>Gerade</b> Woche! <b>({getWeek()})</b></p>} */}
              {props.settings.easterEggs && (date.getFullYear() === 1987 || date.getFullYear() === 1983) && (
                <div class="center">
                  <video width={!!window ? (window.innerWidth > 500 ? window.innerWidth / 1.8 : window.innerWidth / 1.4) : 400} controls>
                    <source src="/egg/biteof87.webm" type="video/webm" />
                  </video>
                </div>
              )}
              {props.settings.easterEggs && date.getFullYear() > 2599 && (
                <div class="center">
                  <video width={!!window ? (window.innerWidth > 500 ? window.innerWidth / 1.8 : window.innerWidth / 1.4) : 400} controls loop>
                    <source src="/egg/glorp.webm" type="video/webm" />
                  </video>
                </div>
              )}
              {props.settings.easterEggs && date.getDate() === 13 && date.getMonth() === 3 && ( // Kirill reference
                <div>
                  <p><span class="blue">Herzlichen Glückwunsch</span> zum Geburtstag, <b>Kirill</b>!</p>
                </div>
              )}

              {props.settings.yellowPaint && list === "" && (<p><b>Notiz</b>: wähle unten einen Klausurplan aus, um dessen Klausuren anzeigen zu lassen.</p>)}
              {props.settings.yellowPaint && list !== "" && props.settings.exams === ExamVisibility.SORTED && props.courses.length === 0 && (<p><b>Notiz</b>: füge (schriftliche) Kurse hinzu, um relevante Klausuren zu sehen.</p>)}
              <Placeholder height="15px" />
              {/* {examList.map((e) => {
                return <ExamDayDisplay date={e.date} day={e.day} timeframe={e.timeframe} exams={e.exams} />;
              })} */}
              <div id="exam-list-wrapper">
                <div id="exam-selector">
                  <h3>Klausurplan</h3>
                  <div id="exam-input">
                    <select value={list} ref={examListSelectRef} onChange={updateExamList}>
                      <option value="">---</option>
                      {availableLists.map((l) => {
                        if (l.name.includes(props.grade.gradeName)) {
                          return (<option value={l.name} disabled={!l.available}>{l.name}</option>)
                        }
                      })}
                      {/* <option value="Q1_1">Q1_1</option>
                      <option value="Q1_2">Q1_2</option>
                      <option value="Q1_3" disabled>Q1_3</option>
                      <option value="Q1_4" disabled>Q1_4</option> */}
                    </select>
                  </div>
                </div>
                <div id="exam-list">
                  {canDisplay() ? examList.map((e) => {
                    return shouldDisplayDay(e, props.settings, props.courses, date) && (<ExamDayDisplay examDays={e} subjectSelectRef={props.subjectSelectRef} settings={props.settings} courses={props.courses} list={list} />)
                  }) : (<div>
                    <span class="blue">Herzlichen Glückwunsch</span><span>. Du hast keine Klausuren!</span>
                  </div>)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Settings(props: { // settings block
  settings: DSBSettings,
  setSettings: Function,
  grade: GradeInfo,
  courses: CourseInfo[],
  setCourses: Function,
}) {
  const [loadedData, setLoadedData] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [resetProgress, setResetProgress] = useState(0);

  const fileRef = useRef();

  const updateSetting = useCallback((setting: string, value: any) => {
    // console.log("UPDATING SETTINGS");
    // console.log(`updating ${setting} to ${value}`);
    // console.log(`old settings notif: ${settings}`)
    const s = props.settings;
    s[setting] = value;
    props.setSettings({...s})
    localStorage.setItem("DSBSettings", JSON.stringify(s));
  }, [props.setSettings, props.settings]);

  const uploadCourse = useCallback(async () => {
    if (!!fileRef) {
      if ((fileRef.current as HTMLInputElement).files.length < 1) {
        setUploadStatus(false);
        return;
      }
      const file = (fileRef.current as HTMLInputElement).files[0];
      try {
        const parsed = JSON.parse(await file.text());
        if (Array.isArray(parsed)) {
          const newCourses = parsed.filter((c) => {
            return c.subject !== undefined && c.subject_name !== undefined && c.course !== undefined;
          })

          if (newCourses.length > 0) {
            props.setCourses(newCourses);
            localStorage.setItem('courses', JSON.stringify(newCourses));
            console.log("Successfully imported courses:");
            console.log(newCourses);
            setUploadStatus(true);
            return;
          }
        }
        setUploadStatus(false);
        return;

      } catch (e) {
        setUploadStatus(false);
        console.error(e);
        return;
      }
    }
  }, [props.setCourses, fileRef])

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("key");
    location.reload();
  }, []);

  const resetBegin = useCallback(() => {
    setResetProgress(1);
  }, [setResetProgress])

  const resetCancel = useCallback(() => {
    setResetProgress(0);
  }, [setResetProgress])

  const reset = useCallback(() => {
    localStorage.clear();
    location.reload();
  }, []);

  useEffect(() => {
    if (!loadedData) {
      const loadedSettings = localStorage.getItem("DSBSettings");

      if (!!loadedSettings) {
        // console.log("Settings valid, updating!")
        props.setSettings(JSON.parse(loadedSettings));
        // console.log(`The settings are now: ${loadedSettings}`)
      }

      // addEventListener("online", dummyNotification);

      setLoadedData(true);
    }

  }, []);

  return (
    <div class="default-div">
      <h2>Einstellungen</h2>
      <Line width="30px" height="3px" />
      {loadedData && (<div class="settings-div">
        <h3 class="code">Webseite</h3>
        <CheckButton
          text="Easter eggs:"
          updater={(v: boolean) => updateSetting("easterEggs", v)}
          checked={props.settings.easterEggs !== undefined ? props.settings.easterEggs : true}
          information="Falls du nur für deine Vertretungen hier bist und nicht um Spaß zu haben, kannst du die verschiedenen Ereignisse ausschalten."
        />
        <CheckButton
          text="Tipps anzeigen:"
          updater={(v: boolean) => updateSetting("yellowPaint", v)}
          checked={props.settings.yellowPaint !== undefined ? props.settings.yellowPaint : true}
          information="Verschiedene Tipps, wie du den DSBScraper effektiver nutzen kannst. Falls du aber schon ein Experte bist, kannst du diese ausschalten."
        />
        <CheckButton
          text="Informationskasten anzeigen:"
          updater={(v: boolean) => updateSetting("showCredits", v)}
          checked={props.settings.showCredits !== undefined ? props.settings.showCredits : true}
        />

        <h3 class="code">Vertretungsplan</h3>
        <CheckButton
          text="Neues Design:"
          updater={(v: boolean) => updateSetting("newDesign", v)}
          checked={props.settings.newDesign !== undefined ? props.settings.newDesign : false}
          information="Das neue Design für den DSBScraper (nach Luis Koch)."
        />
        <Select
          text="Parasiten bekämpfen:"
          options={[{value: ParasitesHandler.NONE, text: "Anzeigen"}, {value: ParasitesHandler.SHORTEN, text: "Kürzen"}, {value: ParasitesHandler.EXTERMINATE, text: "Exterminieren"}]}
          information="AGs können von vielen verschiedenen Klassen belegt werden, sodass der Rest der Vertretungen vom Bildschirm geschoben wird. (lol)"
          updater={(v: string) => updateSetting("parasites", v)}
          value={props.settings.parasites !== undefined ? props.settings.parasites : ParasitesHandler.SHORTEN}
        />

        <h3 class="code">Kurswahl</h3>
        <CheckButton
          text="Kurswahl anzeigen:"
          updater={(v: boolean) => updateSetting("showCourses", v)}
          checked={props.settings.showCourses !== undefined ? props.settings.showCourses : true}
        />

        <CheckButton
          text="Fortgeschrittene Kurse:"
          updater={(v: boolean) => updateSetting("advancedCourses", v)}
          checked={props.settings.advancedCourses !== undefined ? props.settings.advancedCourses : false}
          // information="Einstellungen für Kurse, die die meisten nicht brauchen würden."
          information="Einstellungen für Kurse, die man weniger oft benötigt.">

            <a class="fakebutton" download="courses.json" href={"data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(props.courses))} >Kurse als JSON exportieren (herunterladen)</a>
            <input type="file" accept="text/json, .json" id="course-upload" name="course-upload" ref={fileRef} onChange={uploadCourse} />
            <label class="fakebutton red" for="course-upload">Kurse aus JSON importieren (VORSICHTIG! Überschreibt deine aktuellen Kurse!)</label>
            {!!uploadStatus && (<label>Kurse importiert.</label>)}
            {uploadStatus === false && (<label>Fehler beim importieren von Kursen.</label>)}

        </CheckButton>

        <h3 class="code">Klausurplan</h3>
        <Select
          text="Klausurplan:"
          options={[{value: ExamVisibility.ALL, text: "Alle anzeigen"}, {value: ExamVisibility.SORTED, text: "Nur relevante"}, {value: ExamVisibility.NONE, text: "Verstecken"}]}

          value={props.settings.exams !== undefined ? props.settings.exams : ExamVisibility.SORTED}
          updater={(v: string) => updateSetting("exams", v)}
          disabled={props.grade.gradeName !== "EF" && props.grade.gradeName !== "Q1" && props.grade.gradeName !== "Q2"}
        />
        <CheckButton
          text="Alte Klausuren anzeigen:"
          updater={(v: boolean) => updateSetting("oldExams", v)}
          checked={props.settings.oldExams !== undefined ? props.settings.oldExams : false}
          disabled={props.settings === undefined || props.settings.exams !== ExamVisibility.SORTED}
        />

        <h3 class="code">Verschiedenes</h3>
        <div id="reset-div">
          <input class="fakebutton" type="button" value="Ausloggen" onClick={logout} />
          <input class="fakebutton red" type="button" value="ALLE Daten löschen" onClick={resetBegin} />
          {resetProgress > 0 && (<div>
            <p>Willst du wirklich alle Daten löschen? Du wirst <b>alle Kurse und Einstellungen</b> verlieren.</p>
            <p><b>Das kann nicht rückgängig gemacht werden!</b></p>
            <Placeholder height="18px" />
            <div>
              <input class="fakebutton red" type="button" value=" Ja! " onClick={reset} />
              <input class="fakebutton" type="button" value=" Nein! " onClick={resetCancel} />
            </div>
          </div>)}
        </div>
      </div>)}
    </div>
  );
}
//#endregion

//#region the big one
export default function DSBWidgets(props: {
  version: string;
}) { // main component that nests everything
  const [loggedIn, setLoggedIn] = useState(undefined); // hack to not show the login panel on page load
  const [grade, setGrade] = useState({gradeName: "Q1", gradeLetter: ""} as GradeInfo); // it has to be this way cause fuck me I guess
  const [courses, setCourses] = useState(Array<CourseInfo>(0));
  const [settings, setSettings] = useState(
    {
      easterEggs: true,
      showCourses: true,
      showCredits: true,
      oldExams: false,
      parasites: ParasitesHandler.SHORTEN,
      exams: ExamVisibility.SORTED,
      advancedCourses: false,
      yellowPaint: true, // tell me it didn't happen. tell me it didn't snow.
      newDesign: false, // it snew
    } as DSBSettings); // what

  const subjectSelectRef = useRef(null);

  useEffect(() => {
    validateCredentials().then((valid) => {
      setLoggedIn(valid); // log in if the credentials are valid
    });
  }, []);

  return (
    <div>
      <div class="center">
        {loggedIn === undefined && (
          <div class="default-div">
            <h2>Lade, bitte warten...</h2>
          </div>
        )}
        {loggedIn === false && <DSBLogin setLoggedIn={setLoggedIn} />}
        {loggedIn && (
          <div class="center-rows">
            <DSBTable grade={grade} courses={courses} settings={settings} />
            {(grade.gradeName === "EF" || grade.gradeName === "Q1" || grade.gradeName === "Q2") && (<ExamList settings={settings} subjectSelectRef={subjectSelectRef} courses={courses} grade={grade} />)}
            <CourseList grade={grade} setGrade={setGrade} courses={courses} setCourses={setCourses} subjectSelectRef={subjectSelectRef} settings={settings} />
            <Settings settings={settings} setSettings={setSettings} grade={grade} courses={courses} setCourses={setCourses} />
            {settings.showCredits && (
              <div class="default-div">
                <h2>Informationen</h2>
                <Line width='30px' height='3px' />
    


                {/* <p>Der "zum Kalender hinzufügen"-Knopf macht nichts. Er ist nur sehr ästhetisch.</p>
                <p>Aktuell ist das Vertretungsplan-anzeige-ding sehr bloated und unschön. Ich schaue mal, ob ich evtl. <span class="red">farbige Markierungen</span> hinzufüge oder es komplett redesigne.</p>
                <p>Wahrscheinlich wird das aber das letzte sein, um was ich diese Webseite erweitere. <sup><i>(außer wenn jemand Lust hat, CSS-Themes dieser Seite beizutragen)</i></sup></p> */}
    
                <p>Hier kannst du den <a rel="noopener noreferrer" target="_blank" href="https://github.com/Kirillathome/DSBScraper">Quellcode dieser Website</a> (und dessen API) auffinden.</p>

                <Placeholder height='25px' />
                <h3>Credits:</h3>
                <p>Für diese Website und das API habe ich (hauptsächlich) verwendet:</p>
                <ol>
                    <li>
                      Die Hilfe von <a rel="noopener noreferrer" target="_blank" href="https://www.instagram.com/luiskoch77/">Luis Koch</a> wegen Design und CSS
                    </li>
                    <li>
                        <a rel="noopener noreferrer" target="_blank" href='https://github.com/TheNoim/DSBAPI'>DSBAPI</a> von TheNoim, lizentiert unter <a rel="noopener noreferrer" target="_blank" href='https://github.com/TheNoim/DSBAPI/blob/master/LICENSE'>Apache License 2.0</a>
                    </li>
                    <li>
                        <a rel="noopener noreferrer" target="_blank" href='https://github.com/taoqf/node-html-parser'>node-html-parser</a> von taoqf, lizentiert unter <a rel="noopener noreferrer" target="_blank" href='https://github.com/taoqf/node-html-parser/blob/main/LICENSE'>MIT</a>
                    </li>
                    <li>
                      <a rel="noopener noreferrer" target="_blank" href='https://github.com/modesty/pdf2json'>pdf2json</a> von modesty, lizensiert unter <a rel="noopener noreferrer" target="_blank" href='https://github.com/modesty/pdf2json/blob/master/license.txt'>Apache License 2.0</a>
                    </li>

                </ol>
                <Placeholder height='20px' />
    
                <p>Version der Website: <b><span class='code'>{props.version}</span></b></p>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
//#endregion