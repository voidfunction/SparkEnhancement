export class Format {
    public static oneSecond = 1000;
    public static oneMinute = Format.oneSecond * 60;
    public static oneHour = Format.oneMinute * 60;
    public static oneDay = Format.oneHour * 24;
    public static defaultDateTimeUnitName = {
        durationTextDay : "d",
        durationTextHour: "h",
        durationTextMinute: "m",
        durationTextSecond: "s",
        durationTextMillisecond: "ms"
    }

    public static storageUnits = ["Bytes","KB","MB","GB","TB","PB"];

    /**
     * Formats the given duration in the format of "1d 2hr 29min 0s".
     * @param duration The positive duration in milliseconds.
     * @param includeMS Optional. If true, the formatted string will include milliseconds part. The default value is false.
     */
    public static durationText(duration: number, includeMS: boolean = false): string {
        const parts: string[] = [];

        const extractUnit = (unit: number): number => {
            const value = Math.floor(duration / unit);
            duration %= unit;
            return value;
        };

        const formatPart = (value: number, unitName: string) => `${value} ${unitName}`;

        const addPart = (value: number, unitName: string, force = false) => {
            if (force || parts.length || value > 0) {
                parts.push(formatPart(value, unitName));
            }
        };

        addPart(extractUnit(Format.oneDay), Format.defaultDateTimeUnitName.durationTextDay);
        addPart(extractUnit(Format.oneHour), Format.defaultDateTimeUnitName.durationTextHour);
        addPart(extractUnit(Format.oneMinute), Format.defaultDateTimeUnitName.durationTextMinute);
        addPart(extractUnit(Format.oneSecond), Format.defaultDateTimeUnitName.durationTextSecond, !includeMS);

        if (includeMS) {
            addPart(duration, Format.defaultDateTimeUnitName.durationTextMillisecond, true);
        }

        return parts.join(" ");
    }

    /**
     * Formats the given storage size in bytes as a string in a compacted manner.
     * see https://microsoft.sharepoint.com/teams/DPGBigDataTeam/_layouts/15/WopiFrame.aspx?sourcedoc={CAFD69BC-FF78-4054-9688-33FB46D3CF91}&file=Aesthetically_Pleasing_Display_of_Scalar_Values.docx&action=default
     */
    public static storageSizeText(bytes: number): string {
        var valueAndUnit = Format.getCompactedStorageSizeAndUnit(bytes);

        return `${valueAndUnit.value.toFixed(0)} ${valueAndUnit.unit}`;
    }

    /**
     * Formats the given storage size in bytes as a string in a compacted manner.
     * see https://microsoft.sharepoint.com/teams/DPGBigDataTeam/_layouts/15/WopiFrame.aspx?sourcedoc={CAFD69BC-FF78-4054-9688-33FB46D3CF91}&file=Aesthetically_Pleasing_Display_of_Scalar_Values.docx&action=default
     * This version returns the value text and unit separately.
     */
    public static storageSizeTextEx(bytes: number): { valueText: string, unit: string } {
        var valueAndUnit = Format.getCompactedStorageSizeAndUnit(bytes);

        return {
            valueText: valueAndUnit.value.toString(),
            unit: valueAndUnit.unit
        };
    }

    private static getCompactedStorageSizeAndUnit(bytes: number): { value: number, unit: string } {
        if (bytes === null || bytes === undefined) {
            return {
                value: 0,
                unit: "Byte"
            };
        }

        var value = bytes;
        // keep on dividing by 1000 as long as value >= 1000.0, since it will still have a significant digit to the left of the decimal point after another division.
        for (var i = 0; i < Format.storageUnits.length - 1; i++, value /= 1000) {
            if (Math.abs(value) < 1000) {
                var unit = Format.storageUnits[i];
                if (Math.abs(value) <= 1 && i == 0) {
                    // when value is 1 or -1, use singular 'byte'
                    unit = "Byte";
                }

                return {
                    value: value,
                    unit: unit
                };
            }
        }

        // we don't have any units that are bigger, so just display with the largest unit we have.
        return {
            value: value,
            unit: Format.storageUnits[Format.storageUnits.length - 1]
        };
    }

    /**
     * Splits a string into 3 parts based on a placeholder.
     */
    public static splitTextAtPlaceholder(text: string, placeholder: string): string[] {
        var placeholderIdx = text.indexOf(placeholder);
        if (placeholderIdx >= 0) {
            return [
                text.substr(0, placeholderIdx),
                placeholder,
                text.substr(placeholderIdx + placeholder.length)
            ];
        } else {
            return ["", text, ""];
        }
    }
}