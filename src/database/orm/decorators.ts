import { EnumLike } from "discord.js";
import { Column } from "typeorm";

export function JsonArrayColumn(): PropertyDecorator {
	return process.env.SQLITE_DB
		? Column("text", {
				default: "[]",
				transformer: {
					from: (raw: string | null) => (raw ? JSON.parse(raw) : []),
					to: (entity?: string[]) => (entity ? JSON.stringify(entity) : "[]")
				}
		  })
		: // @Column("varchar", { length: 20, array: true, default: "{}" })
		  // https://github.com/typeorm/typeorm/issues/6990
		  Column("json", { default: [] });
}

export function EnumColumn<E, V>(clazz: EnumLike<E, V>, defaultKey: keyof E): PropertyDecorator {
	return process.env.SQLITE_DB
		? Column("text", { default: clazz[defaultKey] })
		: Column({ type: "enum", enum: clazz, default: clazz[defaultKey] });
}
