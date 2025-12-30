import { useCallback, useEffect, useId, useRef, useState } from "preact/hooks";
import ImgInput from "./imginput";

import helpIcon from "../assets/icons/information.png";
import { ComponentChildren } from "preact";

interface SelectOption {
    value: string,
    text: string,
}

export function CheckButton(props: {
    text: string,
    checked?: boolean,
    information?: string,
    children?: ComponentChildren,
    updater?: Function,
    disabled?: boolean,
    onclick?: Function,
}) {
    const [showHelp, setShowHelp] = useState(false);
    const [checked, setChecked] = useState(props.checked);
    const checkButtonRef = useRef();
    const id = useId();

    const handleHelpClick = useCallback(() => {
        setShowHelp(!showHelp);
    }, [setShowHelp, showHelp]);

    const handleClick = useCallback(() => {
        if (!!props.updater) {
            props.updater((checkButtonRef.current as HTMLInputElement).checked);
        }
        if (!!props.onclick) {
            props.onclick(setChecked);
        }
        setChecked((checkButtonRef.current as HTMLInputElement).checked);
    }, []);

    useEffect(() => {
        if (props.checked) {
            setChecked(props.checked);
        }
        handleClick();
    }, [])

    return (
        <div class="option">
            <div>
                <div>
                    {props.information && (<ImgInput src={helpIcon.src} onClick={handleHelpClick} width="24px" height="24px" alt="info" pixel lazyload />)}
                    <label for={id}>{props.text}</label>
                </div>
                <input type="checkbox" id={id} name={id} checked={!!checked} disabled={props.disabled} ref={checkButtonRef} onClick={handleClick} />
            </div>
            {showHelp && props.information && (<div class="code">
                <p>{props.information}</p>
            </div>)}
            
            {checked && (
                props.children
            )}
        </div>
    );

}

export function Select(props: {
    text: string,
    options: Array<SelectOption>,
    value?: string,
    information?: string,
    children?: ComponentChildren,
    updater?: Function,
    disabled?: boolean,
    onset?: Function,
}) {
    const [showHelp, setShowHelp] = useState(false);
    const [value, setValue] = useState(props.value);
    const selectRef = useRef();
    const id = useId();

    const handleHelpClick = useCallback(() => {
        setShowHelp(!showHelp);
    }, [setShowHelp, showHelp]);

    const handleSet = useCallback(() => {
        if (!props.options || props.options.length < 1) {
            return;
        }

        // console.log((selectRef.current as HTMLSelectElement).selectedOptions[0].value);

        if (!!props.updater) {
            props.updater((selectRef.current as HTMLSelectElement).selectedOptions[0].value)
        }
        if (!!props.onset) {
            props.onset(setValue);
        }

        setValue((selectRef.current as HTMLSelectElement).selectedOptions[0].value)
    }, []);

    useEffect(() => {
        if (!!props.value) {
            setValue(props.value)
        }
        handleSet();
    }, []);

    return (
        <div class="option">
            <div>
                <div>
                    {props.information && (<ImgInput src={helpIcon.src} onClick={handleHelpClick} width="24px" height="24px" alt="info" pixel lazyload />)}
                    <label for={id}>{props.text}</label>
                </div>
                <select ref={selectRef} id={id} name={id} onChange={handleSet} value={value} disabled={props.disabled}>
                    {props.options.map((o) => {
                        return <option value={o.value}>{o.text}</option>
                    })}
                </select>
            </div>
            {showHelp && props.information && (<div class="code">
                <p>{props.information}</p>
            </div>)}
            
            {props.children}
        </div>
    );
}