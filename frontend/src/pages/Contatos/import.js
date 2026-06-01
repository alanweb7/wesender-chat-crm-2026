import { Paper, Tab, Tabs } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import React, { useState } from "react";
import ContactImport from "../../components/ContactImport";
import GoogleMapsImport from "../../components/GoogleMapsImport";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

const useStyles = makeStyles(theme => ({
    mainPaper: {
        flex: 1,
        padding: 1,
        borderRadius: 0,
        overflowY: "scroll",
        ...theme.scrollbarStylesSoftBig
    },
    tabs: {
        borderBottom: `1px solid ${theme.palette.divider}`,
        marginBottom: theme.spacing(1)
    }
}));

const ContactImportPage = () => {
    const classes = useStyles();
    const [tab, setTab] = useState(0);

    return (
        <MainContainer className={classes.mainContainer}>
            <MainHeader>
                <Title>Importar Contatos</Title>
            </MainHeader>
            <Paper className={classes.mainPaper} variant="outlined">
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    indicatorColor="primary"
                    textColor="primary"
                    className={classes.tabs}
                >
                    <Tab label="Importar Arquivo" />
                    <Tab label="Extrair do Google Maps" />
                </Tabs>
                {tab === 0 && <ContactImport />}
                {tab === 1 && <GoogleMapsImport />}
            </Paper>
        </MainContainer>
    );
};

export default ContactImportPage;
