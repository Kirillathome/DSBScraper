export default function Notice(props: {
    text: String,
    color?: String,
}) {
    return (
        <div class="notice">
            <h2>{props.text}</h2>
        </div>
    );
} 