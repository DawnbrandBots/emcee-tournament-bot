import * as fs from "fs/promises";

export class Templater {
	private templates: Record<string, string> = {}; // index: name

	public async load(directory: string): Promise<number> {
		const files = await fs.readdir(directory);
		for (const file of files.filter(f => f.endsWith(".template.md"))) {
			const guide = await fs.readFile(`${directory}/${file}`, "utf-8");
			const name = file.split(".")[0];
			this.templates[name] = guide;
		}
		return files.length;
	}

	public format(name: string, value: string): string {
		return this.templates[name].replace(/{}/g, value);
	}
}
