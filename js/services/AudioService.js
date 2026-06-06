const AudioService = {

    async loadTiming(examCode) {

        const response =
            await fetch(
                `data/audio-timings/${examCode}.json`
            );

        return await response.json();
    }

};