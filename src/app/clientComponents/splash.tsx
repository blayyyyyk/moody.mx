import styles from '../styles/Home.module.css'
import Background from './background';
import Heading from './heading';

import PROFILE_BG from '../public/profile-cropped.jpg';
import "../../../styles/globals.css";

import Banner from './banner';
import Links from './links';




export default function Splash() {
    return (
        <div className={`w-full max-w-full h-screen flex items-center py-3 justify-center bg-secondary`}>
            <Background />
            <Banner speed={15}>This website was meticulously designed and developed by me. To learn more about the technologies and programs used in the project, take a minute to check out my Github.</Banner>
            
            <Links />
        </div>
    )
}