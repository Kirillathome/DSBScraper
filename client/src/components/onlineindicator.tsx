import { useCallback, useEffect, useState } from "preact/hooks";
import Notice from "./notice";

export default function OnlineIndicator() {
    const [offline, setOffline] = useState(false);
    const offlineCallback = useCallback(() => {
        if (!!navigator.onLine) {
            setOffline(false);
        }
        if (!!!navigator.onLine) {
            setOffline(true);
        }
    }, [setOffline]);
    
    useEffect(() => {
        offlineCallback();
    }, [])

    window.onoffline = offlineCallback;
    window.ononline = offlineCallback;

    return (
        <div class="notice-wrapper">
           {offline && (<Notice text="Notiz: Du bist offline." />)}
        </div>
    );
}