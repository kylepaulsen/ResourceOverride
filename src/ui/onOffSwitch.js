const onOffSwitchTemplate = document.getElementById("onOffSwitchTemplate");

const createOnOffSwitch = () => {
    return document.importNode(onOffSwitchTemplate.content, true);
};

export default createOnOffSwitch;
