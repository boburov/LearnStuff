import { IsString } from "class-validator";

export class CreateAuthDto {
    @IsString()
    tgId!: string;
}
