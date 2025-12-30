import email_icon from '../assets/email.png'; // Email is now canonically social media
import github_icon from '../assets/github.png';
import instagram_icon from '../assets/instagram.png';

const email = "mailto:d112lamio@mozmail.com";
const github = "https://github.com/Kirillathome";
const instagram = "https://www.instagram.com/kirillathome/";

export default function SocialMediaWidgets() {
    return (
        <div class='social-media-widgets'>
            <a href={instagram} target='_blank' rel="noopener noreferrer">
                <img src={instagram_icon.src} alt='instagram' width='48' height='48' class='pixel' loading='lazy'></img>
            </a>
            <a href={github} target='_blank' rel="noopener noreferrer">
                <img src={github_icon.src} alt='github' width='48' height='48' class='pixel' loading='lazy'></img>
            </a>
            <a href={email} target='_blank' rel="noopener noreferrer">
                <img src={email_icon.src} alt='email' width='42' height='42' class='pixel' loading='lazy'></img>
            </a>
        </div>
    );
}