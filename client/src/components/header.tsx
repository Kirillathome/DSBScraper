import { useCallback, useEffect, useState } from "preact/hooks";

export default function Header(props: {
	homepage: string,
	logo?: ImageMetadata | string,
	width: string,
	height: string,
	pixel: boolean,
	text: string,
	children?: any,
	version: string
}) {
	const [mobile, setMobile] = useState(false);
	const resizeCallback = useCallback(
		() => {
			if (window.innerWidth < 767) { // pretty sure this is a code warcrime since you can achieve the same with just CSS but I'm not changing it
				setMobile(true);
			} else {
				setMobile(false);
			}
		},
		[]
	);
	useEffect(() => {
		
		// const resizeCallback = useCallback(
		// 	() => {
		// 		if (window.innerWidth < 767) {
		// 			setMobile(true);
		// 		} else {
		// 			setMobile(false);
		// 		}
		// 	},
		// 	[]
		// );
		
		resizeCallback();
	}, []);
	
	window.onresize = resizeCallback;
	return (
		<header>
			{!mobile && (<a href={props.homepage}>
				<img src={typeof props.logo === "object" ? props.logo.src : props.logo} alt='logo' width={props.width} height={props.height} class={props.pixel ? 'pixel' : ''} />
			</a>)}
			<div>
				<h1>{props.text}
					{props.children}
				</h1>
			</div>
			{!mobile && (<div>
				<h3 class='code'>
					{props.version}
				</h3>
			</div>)}
		</header>
	);
}