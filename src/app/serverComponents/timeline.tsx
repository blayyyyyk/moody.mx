import "reactflow/dist/style.css";
import { Program } from "../../lib/types";
import TimelineClient from "../clientComponents/timelineEvent";
import Heading from "../clientComponents/heading";

const sheetsId = process.env.NEXT_PUBLIC_SHARED_SHEETS_ID; // Retrieve the folder ID from the query parameter
const apiKey = process.env.NEXT_PUBLIC_GCP_API_KEY; // Use your environment variable for the Google API key
const programColumnName = "Program Name";

export async function getSheetsData(table: string, range: string) {
    try {
        // Google Drive API endpoint to list files within a folder
        const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${table}!${range}?key=${apiKey}`;

        const response = await fetch(endpoint, { next: { revalidate: 60 } });

        let data = await response.json().then((data) => data.values);

        // Return the list of files in JSON format
        return data;
    } catch (error) {
        throw error;
    }
}

export async function getSheetFields(table: string) {
    return getSheetsData(table, "1:1").then((v) => v[0]);
}

export function reshapeSheet(fieldData: any[][], fields: string[]) {
    return fieldData.map((row: any[]) => {
        return Object.fromEntries(
            row.map((field: any, index: number) => [fields[index], field]),
        );
    });
}

export default async function Timeline() {
    // Course data
    const courseFields = await getSheetFields("Courses");
    const courses = await getSheetsData("Courses", "A2:G").then((fieldData) =>
        reshapeSheet(fieldData, courseFields),
    );

    // Program data
    const programFields = await getSheetFields("Programs");
    const programData = await getSheetsData("Programs", "A2:F").then(
        (programData) => reshapeSheet(programData, programFields),
    );

    // Coallesce and filter
    const programs = programData.map((entry: any) => ({
        Events: courses.filter(
            (event: any) =>
                event[programColumnName] == entry[programColumnName],
        ),
        ...entry,
    }));

    return (
        <>
            <div className="px-3 w-full h-auto">
                <Heading className="border-primary border-1 p-3 text-wrap">
                    Timeline
                </Heading>
            </div>
            <TimelineClient programs={programs} />
        </>
    );
}
