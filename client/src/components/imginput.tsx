import { MouseEventHandler } from "preact/compat";

export default function ImgInput(props: {
    onClick: MouseEventHandler<HTMLButtonElement>,
    src: string,
    pixel?: boolean,
    width: string,
    height: string,
    alt?: string,
    lazyload?: boolean,
}) {
    return (
        <button type='button' onClick={props.onClick} class='imgInput'>
            <img src={props.src} class={props.pixel ? 'pixel' : ''} width={props.width} height={props.height} alt={props.alt} loading={props.lazyload ? 'lazy' : null} />
        </button>
    );
}