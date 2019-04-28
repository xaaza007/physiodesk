'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const when = require('when');
const client = require('./client');

const follow = require('./follow');  // function to hop multiple links by "rel"

const root = '/api';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {patients: [], attributes: [], pageSize: 2, links: {}};
        this.updatePageSize = this.updatePageSize.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onNavigate = this.onNavigate.bind(this);
    }

    //FOLLOW
    loadFromServer(pageSize) {
        follow(client, root, [
            {rel: 'patients', params: {size: pageSize}}]
        ).then(patientCollection => {
            return client({
                method: 'GET',
                path: patientCollection.entity._links.profile.href,
                headers: {'Accept': 'application/schema+json'}
            }).then(schema => {
                this.schema = schema.entity;
                this.links = patientCollection.entity._links;
                return patientCollection;
            });
        }).then(patientCollection => {
            return patientCollection.entity._embedded.patients.map(patient =>
                client({
                    method: 'GET',
                    path: patient._links.self.href
                })
            );
        }).then(patientPromises => {
            return when.all(patientPromises);
        }).done(patients => {
            this.setState({
                patients: patients,
                attributes: Object.keys(this.schema.properties),
                pageSize: pageSize,
                links: this.links
            });
        });
    }

    //END OF FOLLOW

    //CREATE
    onCreate(newPatient) {
        follow(client, root, ['patients']).then(response => {
            return client({
                method: 'POST',
                path: response.entity._links.self.href,
                entity: newPatient,
                headers: {'Content-Type': 'application/json'}
            })
        }).then(response => {
            return follow(client, root, [{rel: 'patients', params: {'size': self.state.pageSize}}]);
        }).done(response => {
            if (typeof response.entity._links.last !== "undefined") {
                this.onNavigate(response.entity._links.last.href);
            } else {
                this.onNavigate(response.entity._links.self.href);
            }
        });
    }

    //END OF CREATE

    //UPDATE
    onUpdate(patient, updatedPatient) {
        client({
            method: 'PUT',
            path: patient.entity._links.self.href,
            entity: updatedPatient,
            headers: {
                'Content-Type': 'application/json',
                'If-Match': patient.headers.Etag
            }
        }).done(response => {
            this.loadFromServer(this.state.pageSize);
        }, response => {
            if (response.status.code === 412) {
                alert('DANIED: Unable to update ' +
                    patient.entity._links.self.href + '.Your copy is stale.');
            }
        });
    }
    //end of update

    //DELETE
    onDelete(patient) {
        client({method: 'DELETE', path: patient.entity._links.self.href}).done(response => {
            this.loadFromServer(this.stage.pageSize);
        });
    }

    //END of DELETE

    //NAVIGATE
    onNavigate(navUri) {
        client({
            method: 'GET',
            path: navUri
        }).then(patientCollection => {
            this.links = patientCollection.entity._links;

            return patientCollection.entity._embedded.patients.map(patient =>
                client({
                    method: 'GET',
                    path: patient.links.self.href
                })
            );
        }).then(patientPromises => {
        return when.all(patientPromises);
        }).done(patients => {
            this.setState({
                patients: patients,
                attributes: Object.keys(this.schema.properties),
                pageSize: this.state.pageSize,
                links: this.links
            });
        });
    }
    //END OF NAVIGATE

    // update-page
    updatePageSize(pageSize) {
        if (pageSize !== this.state.pageSize) {
            this.loadFromServer(pageSize);
        }
    }

    // end of update-page-size

    //FOLLOW-1
    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
    }
    //end of follow-1

    render() {
        return (
            <div>
                <CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
                <PatientList patients={this.state.patients}
                             links={this.state.links}
                             pageSize={this.state.pageSize}
                             onNavigate={this.onNavigate}
                             onUpdate={this.onUpdate}
                             onDelete={this.onDelete}
                             updatePageSize={this.updatePageSize}/>
            </div>
        )
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        const newPatient = {};
        this.props.attributes.forEach(attribute => {
            newPatient[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onCreate(newPatient);

        // clear out the dialog's inputs
        this.props.attributes.forEach(attributes => {
            ReactDOM.findDOMNode(this.refs[attributes]).value = '';
        });

        // Navigate away from the dialog to hide it
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attributes =>
            <p key={attributes}>
                <input type="text" placeholder={attributes} ref={attributes} className="field"/>
            </p>
        );

        return (
            <div>
                <a href="#createPatient">Dodaj pacjenta</a>

                <div id="createPatient" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Utwórz profil pacjenta</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Dodaj</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }


}
//end of create dialog

//update-dialog
class UpdateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        const updatedPatient = {};
        this.props.attributes.forEach(attribute => {
            updatedPatient[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onUpdate(this.props.patient, updatedPatient);
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attribute =>
            <p key={this.props.patient.entity[attribute]}>
                <input type="text" placeholder={attribute}
                       defaultValue={this.props.patient.entity[attribute]}
                       ref={attribute} className="field"/>
            </p>
        );

        const dialogId = "updatePatient-" + this.props.patient.entity._links.self.href;

        return (
            <div key={this.props.patient.entity._links.self.href}>
                <a href={"#" + dialogId}>Update</a>
                <div id={dialogId} className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>
                        <h2>Update an patient</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Update</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }
};
//end of update-dialog


class PatientList extends React.Component {

    constructor(props) {
        super(props);
        this.handleNavFirst = this.handleNavFirst.bind(this);
        this.handleNavPrev = this.handleNavPrev.bind(this);
        this.handleNavNext = this.handleNavNext.bind(this);
        this.handleNavLast = this.handleNavLast.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    //handle-page-size-updates
    handleInput(e) {
        e.preventDefault();
        const pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
        if (/^[0-9]+$/.test(pageSize)) {
            this.props.updatePageSize(pageSize);
        } else {
            ReactDOM.findDOMNode(this.refs.pageSize).value = pageSize.substring(0, pageSize.length - 1);
        }
    }

    //end of handle-page-size-update

    //HANDLE-NAV[]
    handleNavFirst(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.first.href);
    }

    handleNavPrev(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.prev.href);
    }

    handleNavNext(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.next.href);
    }

    handleNavLast(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.last.href);
    }

    //END OF HANDLE-NAV

    //PATIENT-LIST-RENDER
    render() {
        const patients = this.props.patients.map(patient =>
            <Patient key={patient.entity._links.self.href}
                            patient={patient}
                            attributes={this.props.attributes}
                            onUpdate={this.props.onUpdate}
                            onDelete={this.props.onDelete}/>
        );

        const navLinks = [];
        if ("first" in this.props.links) {
            navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
        }
        if ("prev" in this.props.links) {
            navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
        }
        if ("next" in this.props.links) {
            navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
        }
        if ("last" in this.props.links) {
            navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
        }

        return (
            <div>
                <input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
                <table>
                    <tbody>
                    <tr>
                        <th>Imię</th>
                        <th>Nazwisko</th>
                        <th>Opis</th>
                        <th></th>
                        <th></th>
                    </tr>
                    {patients}
                    </tbody>
                </table>
                <div>
                    {navLinks}
                </div>
            </div>
        )
    }
}

//END OF PATIENT-LIST-RENDER

//PATIENT
class Patient extends React.Component {

    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete() {
        this.props.onDelete(this.props.patient);
    }

    render() {
        return (
            <tr>
                <td>{this.props.patient.entity.firstName}</td>
                <td>{this.props.patient.entity.lastName}</td>
                <td>{this.props.patient.entity.description}</td>
                <td>
                    <UpdateDialog patient={this.props.patient}
                                  attributes={this.props.attributes}
                                  onUpdate={this.props.onUpdate}/>
                </td>
                <td>
                    <button onClick={this.handleDelete}>Delete</button>
                </td>
            </tr>
        )
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById('react')
);